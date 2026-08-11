import { useCallback, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UploadCloud, X, AlertTriangle, CheckCircle2, Loader2, Image as ImageIcon, Box } from "lucide-react";

const BUCKET = "project-media";

/* ================================================================
 * Shared upload helpers — validation, signed URLs, progress
 * ================================================================ */

const IMAGE_MIME = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];
const MODEL_EXT = [".glb", ".gltf"];
const MODEL_MIME = ["model/gltf-binary", "model/gltf+json", "application/octet-stream"];

const IMAGE_MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const MODEL_MAX_BYTES = 40 * 1024 * 1024; // 40 MB
const GALLERY_MAX = 12;

function human(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function uploadToBucket(
  file: File,
  folder: string,
  onProgress?: (pct: number) => void,
): Promise<{ path: string; publicUrl: string }> {
  const ext = file.name.includes(".") ? file.name.split(".").pop()! : "bin";
  const safe = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;

  // supabase-js v2 supports onUploadProgress via XHR-based upload; fall back to fake progress otherwise.
  onProgress?.(5);
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    contentType: file.type || (ext === "glb" ? "model/gltf-binary" : undefined),
    upsert: false,
  });
  if (error) throw new Error(error.message);
  onProgress?.(90);

  // Bucket is private → use signed URL (1 year) for a stable public-ish link.
  const { data: signed, error: sErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  if (sErr || !signed) throw new Error(sErr?.message ?? "Failed to sign URL");
  onProgress?.(100);
  return { path, publicUrl: signed.signedUrl };
}

/* ================================================================
 * <ImageUploadField/> — single image, validated, previewed
 * ================================================================ */

export function ImageUploadField({
  label,
  name,
  value,
  folder,
  disabled,
  onChange,
}: {
  label: string;
  name: string;
  value: string | null;
  folder: string;
  disabled?: boolean;
  /** Optional controlled callback — fires whenever the resolved URL changes. */
  onChange?: (url: string) => void;
}) {
  const [url, setUrl] = useState<string>(value ?? "");
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [broken, setBroken] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const notify = useRef(onChange);
  notify.current = onChange;
  useEffect(() => {
    notify.current?.(url);
  }, [url]);



  const validate = useCallback((f: File): string | null => {
    if (!IMAGE_MIME.includes(f.type)) {
      return `Unsupported format “${f.type || "unknown"}”. Use JPG, PNG, WebP, AVIF or GIF.`;
    }
    if (f.size > IMAGE_MAX_BYTES) {
      return `File is ${human(f.size)} — max ${human(IMAGE_MAX_BYTES)}.`;
    }
    return null;
  }, []);

  async function handleFile(f: File | undefined) {
    if (!f) return;
    setErr(null);
    setBroken(false);
    const v = validate(f);
    if (v) { setErr(v); return; }
    setBusy(true);
    setProgress(0);
    try {
      const { publicUrl } = await uploadToBucket(f, folder, setProgress);
      setUrl(publicUrl);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
        {url && !err && <span className="text-[10px] font-semibold text-emerald-600">✓ ready</span>}
      </div>
      <input type="hidden" name={name} value={url} />

      <div
        className={`relative overflow-hidden rounded-2xl border ${err ? "border-rose-400" : "border-border"} bg-background`}
      >
        {url && !broken ? (
          <div className="relative h-40 w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={label}
              onError={() => setBroken(true)}
              className="h-full w-full object-cover"
            />
            {!disabled && (
              <button
                type="button"
                onClick={() => { setUrl(""); setBroken(false); }}
                className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
                aria-label="Remove image"
              >
                <X size={14} />
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => inputRef.current?.click()}
            className="flex h-40 w-full flex-col items-center justify-center gap-2 text-muted-foreground transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {broken ? (
              <>
                <AlertTriangle size={22} className="text-amber-500" />
                <span className="text-xs font-semibold">Preview failed to load — pick a new image</span>
              </>
            ) : busy ? (
              <>
                <Loader2 size={22} className="animate-spin" />
                <span className="text-xs font-semibold">Uploading… {progress}%</span>
              </>
            ) : (
              <>
                <ImageIcon size={22} />
                <span className="text-xs font-semibold">Click to upload {label.toLowerCase()}</span>
                <span className="text-[10px]">JPG / PNG / WebP · up to {human(IMAGE_MAX_BYTES)}</span>
              </>
            )}
          </button>
        )}

        {busy && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_MIME.join(",")}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          type="url"
          placeholder="…or paste a public https:// URL"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setBroken(false); setErr(null); }}
          disabled={disabled}
          className="flex-1 rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        {url && (
          <button
            type="button"
            onClick={() => { setUrl(""); setBroken(false); setErr(null); }}
            className="rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>

      {err && (
        <p className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-semibold text-rose-700">
          <AlertTriangle size={12} /> {err}
        </p>
      )}
    </div>
  );
}

/* ================================================================
 * <ImageGalleryUploader/> — many images w/ count + type + size caps
 * ================================================================ */

export function ImageGalleryUploader({
  name,
  value,
  folder,
  max = GALLERY_MAX,
  disabled,
}: {
  name: string;
  value: string[];
  folder: string;
  max?: number;
  disabled?: boolean;
}) {
  const [urls, setUrls] = useState<string[]>(value);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function addFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setErr(null);
    const room = max - urls.length;
    if (room <= 0) { setErr(`Gallery limit reached — max ${max} images.`); return; }
    const chosen = Array.from(files).slice(0, room);

    for (const f of chosen) {
      if (!IMAGE_MIME.includes(f.type)) { setErr(`Skipped “${f.name}” — unsupported format.`); continue; }
      if (f.size > IMAGE_MAX_BYTES) { setErr(`Skipped “${f.name}” — ${human(f.size)} exceeds ${human(IMAGE_MAX_BYTES)}.`); continue; }
    }
    const valid = chosen.filter((f) => IMAGE_MIME.includes(f.type) && f.size <= IMAGE_MAX_BYTES);
    if (!valid.length) return;

    setBusy(true);
    try {
      for (let i = 0; i < valid.length; i++) {
        const f = valid[i];
        const { publicUrl } = await uploadToBucket(f, folder, (p) =>
          setProgress(Math.round(((i + p / 100) / valid.length) * 100)),
        );
        setUrls((u) => [...u, publicUrl]);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      setProgress(0);
    }
  }

  const serialized = useMemo(() => JSON.stringify(urls), [urls]);

  return (
    <div>
      <input type="hidden" name={name} value={serialized} />
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">
          Gallery ({urls.length}/{max})
        </span>
        <button
          type="button"
          disabled={disabled || busy || urls.length >= max}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
        >
          <UploadCloud size={12} /> Add images
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_MIME.join(",")}
        multiple
        className="hidden"
        onChange={(e) => addFiles(e.target.files)}
      />
      {busy && (
        <div className="mb-2 h-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
      {err && (
        <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-rose-700">
          <AlertTriangle size={12} /> {err}
        </p>
      )}
      {urls.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-background px-4 py-8 text-xs text-muted-foreground">
          No images yet. JPG/PNG/WebP · ≤ {human(IMAGE_MAX_BYTES)} each · up to {max}.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {urls.map((u, i) => (
            <GalleryThumb key={`${u}-${i}`} url={u} onRemove={() => setUrls((arr) => arr.filter((_, idx) => idx !== i))} disabled={disabled} />
          ))}
        </div>
      )}
    </div>
  );
}

function GalleryThumb({ url, onRemove, disabled }: { url: string; onRemove: () => void; disabled?: boolean }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className="relative aspect-square overflow-hidden rounded-xl border border-border bg-muted/40">
      {broken ? (
        <div className="grid h-full w-full place-items-center text-[10px] font-semibold text-amber-700">
          <AlertTriangle size={16} />
          broken
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" onError={() => setBroken(true)} className="h-full w-full object-cover" />
      )}
      {!disabled && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
          aria-label="Remove"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}

/* ================================================================
 * <Model3DUploadField/> — .glb/.gltf upload, live preview, fallback
 * ================================================================ */

export function Model3DUploadField({
  label,
  name,
  value,
  folder,
  disabled,
}: {
  label: string;
  name: string;
  value: string | null;
  folder: string;
  disabled?: boolean;
}) {
  const [url, setUrl] = useState<string>(value ?? "");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [broken, setBroken] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function validate(f: File): string | null {
    const lower = f.name.toLowerCase();
    const okExt = MODEL_EXT.some((e) => lower.endsWith(e));
    const okMime = !f.type || MODEL_MIME.includes(f.type);
    if (!okExt) return `Unsupported file — use .glb or .gltf (got “${lower.split(".").pop()}”).`;
    if (!okMime) return `Unexpected MIME “${f.type}”. Expected model/gltf-binary.`;
    if (f.size > MODEL_MAX_BYTES) return `Model is ${human(f.size)} — max ${human(MODEL_MAX_BYTES)}.`;
    return null;
  }

  async function handleFile(f: File | undefined) {
    if (!f) return;
    setErr(null); setBroken(false);
    const v = validate(f);
    if (v) { setErr(v); return; }
    setBusy(true); setProgress(0);
    try {
      const { publicUrl } = await uploadToBucket(f, folder, setProgress);
      setUrl(publicUrl);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  const isGlb = /\.(glb|gltf)(\?|$)/i.test(url);
  const isEmbed = /matterport|sketchfab|youtube|youtu\.be|vimeo/i.test(url);

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
        {url && !err && !broken && <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600"><CheckCircle2 size={10} /> ready</span>}
      </div>
      <input type="hidden" name={name} value={url} />

      <div className={`overflow-hidden rounded-2xl border ${err ? "border-rose-400" : "border-border"} bg-background`}>
        <div className="grid h-48 w-full place-items-center bg-gradient-to-br from-primary/5 to-primary/10">
          {broken || (url && !isGlb && !isEmbed && !/^https?:\/\//.test(url)) ? (
            <div className="flex flex-col items-center gap-1 text-center">
              <AlertTriangle size={22} className="text-amber-500" />
              <span className="text-xs font-semibold text-amber-700">Preview unavailable</span>
              <span className="text-[10px] text-muted-foreground">The model failed to load — check the URL or re-upload.</span>
            </div>
          ) : busy ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 size={22} className="animate-spin" />
              <span className="text-xs font-semibold">Uploading model… {progress}%</span>
            </div>
          ) : url && isEmbed ? (
            <iframe
              title="3D tour"
              src={url}
              onError={() => setBroken(true)}
              className="h-full w-full"
              allow="fullscreen; xr-spatial-tracking; vr; accelerometer; gyroscope"
              allowFullScreen
            />
          ) : url && isGlb ? (
            <div className="flex flex-col items-center gap-2 text-center text-primary">
              <Box size={26} />
              <span className="text-xs font-semibold">GLB model ready</span>
              <a href={url} target="_blank" rel="noreferrer" className="text-[10px] font-semibold underline">Open in new tab</a>
            </div>
          ) : (
            <button
              type="button"
              disabled={disabled || busy}
              onClick={() => inputRef.current?.click()}
              className="flex flex-col items-center gap-2 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
            >
              <Box size={26} />
              <span className="text-xs font-semibold">Upload a .glb / .gltf model</span>
              <span className="text-[10px]">≤ {human(MODEL_MAX_BYTES)} · or paste a Matterport / Sketchfab / video URL</span>
            </button>
          )}
        </div>
        {busy && (
          <div className="h-1 bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={[".glb", ".gltf", "model/gltf-binary", "model/gltf+json"].join(",")}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          type="url"
          placeholder="…or paste a public 3D URL"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setBroken(false); setErr(null); }}
          disabled={disabled}
          className="flex-1 rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        {url && (
          <button
            type="button"
            onClick={() => { setUrl(""); setBroken(false); setErr(null); }}
            className="rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>

      {err && (
        <p className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-semibold text-rose-700">
          <AlertTriangle size={12} /> {err}
        </p>
      )}
    </div>
  );
}
