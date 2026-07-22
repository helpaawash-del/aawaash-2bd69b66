// Renders the CMS block tree. Shared between admin preview and (Phase 2) the public site.
type Block = {
  id: string;
  type: string;
  hidden?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props?: Record<string, any>;
};

export const BLOCK_TYPES: Array<{ type: string; label: string; defaults: Block["props"] }> = [
  { type: "hero", label: "Hero", defaults: { title: "Headline", subtitle: "Supporting copy", ctaLabel: "Get started", ctaHref: "#" } },
  { type: "features", label: "Features grid", defaults: { title: "Features", items: [{ title: "Feature 1", body: "…" }] } },
  { type: "stats", label: "Statistics", defaults: { items: [{ label: "Projects", value: "20+" }] } },
  { type: "testimonials", label: "Testimonials", defaults: { items: [{ quote: "Amazing!", author: "Anonymous" }] } },
  { type: "cta", label: "Call to action", defaults: { title: "Ready to start?", ctaLabel: "Contact us", ctaHref: "/contact" } },
  { type: "faq", label: "FAQ", defaults: { items: [{ q: "Question?", a: "Answer." }] } },
  { type: "richtext", label: "Rich text", defaults: { body: "Write markdown-like text…" } },
  { type: "media", label: "Media", defaults: { url: "", alt: "" } },
  { type: "spacer", label: "Spacer", defaults: { height: 48 } },
  { type: "html", label: "Custom HTML", defaults: { html: "<div>Custom</div>" } },
];

export function BlockRenderer({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-8">
      {blocks.filter((b) => !b.hidden).map((b) => (
        <BlockView key={b.id} block={b} />
      ))}
    </div>
  );
}

function BlockView({ block }: { block: Block }) {
  const p = block.props ?? {};
  switch (block.type) {
    case "hero":
      return (
        <section className="rounded-3xl border border-border bg-card p-8 text-center">
          <h1 className="text-3xl font-black sm:text-5xl">{p.title}</h1>
          {p.subtitle ? <p className="mt-3 text-muted-foreground">{p.subtitle}</p> : null}
          {p.ctaLabel ? (
            <a href={p.ctaHref || "#"} className="mt-6 inline-flex rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">{p.ctaLabel}</a>
          ) : null}
        </section>
      );
    case "features":
      return (
        <section className="rounded-3xl border border-border bg-card p-6">
          <h2 className="text-2xl font-bold">{p.title}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(p.items ?? []).map((it: { title?: string; body?: string }, i: number) => (
              <div key={i} className="rounded-2xl border border-border bg-background p-4">
                <div className="font-semibold">{it.title}</div>
                <div className="mt-1 text-sm text-muted-foreground">{it.body}</div>
              </div>
            ))}
          </div>
        </section>
      );
    case "stats":
      return (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(p.items ?? []).map((it: { label?: string; value?: string }, i: number) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-5 text-center">
              <div className="text-3xl font-black">{it.value}</div>
              <div className="text-xs uppercase text-muted-foreground">{it.label}</div>
            </div>
          ))}
        </section>
      );
    case "testimonials":
      return (
        <section className="grid gap-4 sm:grid-cols-2">
          {(p.items ?? []).map((it: { quote?: string; author?: string }, i: number) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-5">
              <p className="italic">“{it.quote}”</p>
              <div className="mt-2 text-sm font-semibold">— {it.author}</div>
            </div>
          ))}
        </section>
      );
    case "cta":
      return (
        <section className="rounded-3xl bg-primary p-8 text-center text-primary-foreground">
          <h2 className="text-2xl font-black">{p.title}</h2>
          {p.ctaLabel ? (
            <a href={p.ctaHref || "#"} className="mt-4 inline-flex rounded-xl bg-primary-foreground px-5 py-2 text-sm font-semibold text-primary">{p.ctaLabel}</a>
          ) : null}
        </section>
      );
    case "faq":
      return (
        <section className="rounded-3xl border border-border bg-card p-6">
          {(p.items ?? []).map((it: { q?: string; a?: string }, i: number) => (
            <details key={i} className="border-b border-border py-3">
              <summary className="cursor-pointer font-semibold">{it.q}</summary>
              <p className="mt-2 text-sm text-muted-foreground">{it.a}</p>
            </details>
          ))}
        </section>
      );
    case "richtext":
      return <section className="prose max-w-none rounded-3xl border border-border bg-card p-6 whitespace-pre-wrap">{p.body}</section>;
    case "media":
      return p.url ? <img src={p.url} alt={p.alt || ""} className="mx-auto rounded-3xl" /> : null;
    case "spacer":
      return <div style={{ height: p.height || 48 }} />;
    case "html":
      return <section dangerouslySetInnerHTML={{ __html: p.html || "" }} />;
    default:
      return <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">Unknown block: {block.type}</div>;
  }
}

export type { Block };
