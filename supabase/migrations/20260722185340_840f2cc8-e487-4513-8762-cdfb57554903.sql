
-- Rename cms_media -> assets
ALTER TABLE public.cms_media RENAME TO assets;
ALTER INDEX cms_media_pkey RENAME TO assets_pkey;

-- Extend assets with DAM columns
ALTER TABLE public.assets DROP CONSTRAINT cms_media_kind_check;
ALTER TABLE public.assets ADD CONSTRAINT assets_kind_check
  CHECK (kind = ANY (ARRAY['image','video','pdf','svg','gif','doc','archive','model','lottie','icon','other']));

ALTER TABLE public.assets
  ADD COLUMN folder_id uuid,
  ADD COLUMN tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN description text,
  ADD COLUMN caption text,
  ADD COLUMN width int,
  ADD COLUMN height int,
  ADD COLUMN duration_seconds numeric,
  ADD COLUMN usage_count int NOT NULL DEFAULT 0,
  ADD COLUMN download_count int NOT NULL DEFAULT 0,
  ADD COLUMN current_version int NOT NULL DEFAULT 1,
  ADD COLUMN checksum text,
  ADD COLUMN original_name text,
  ADD COLUMN status text NOT NULL DEFAULT 'active',
  ADD COLUMN deleted_at timestamptz,
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN updated_by uuid,
  ADD COLUMN asset_code text;

ALTER TABLE public.assets ADD CONSTRAINT assets_status_check CHECK (status IN ('active','archived','deleted'));

-- Backfill original_name and asset_code
UPDATE public.assets SET original_name = filename WHERE original_name IS NULL;
UPDATE public.assets SET asset_code = 'AST-' || upper(substr(replace(id::text,'-',''),1,10)) WHERE asset_code IS NULL;
ALTER TABLE public.assets ALTER COLUMN original_name SET NOT NULL;
ALTER TABLE public.assets ALTER COLUMN asset_code SET NOT NULL;
CREATE UNIQUE INDEX assets_asset_code_key ON public.assets(asset_code);
CREATE INDEX assets_folder_idx ON public.assets(folder_id);
CREATE INDEX assets_kind_idx ON public.assets(kind);
CREATE INDEX assets_status_idx ON public.assets(status);
CREATE INDEX assets_tags_idx ON public.assets USING gin(tags);
CREATE INDEX assets_filename_idx ON public.assets(filename);

-- Folders
CREATE TABLE public.asset_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  parent_id uuid REFERENCES public.asset_folders(id) ON DELETE CASCADE,
  path text NOT NULL,
  is_pinned boolean NOT NULL DEFAULT false,
  is_favorite boolean NOT NULL DEFAULT false,
  color text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX asset_folders_root_slug ON public.asset_folders(slug) WHERE parent_id IS NULL;
CREATE UNIQUE INDEX asset_folders_child_slug ON public.asset_folders(parent_id, slug) WHERE parent_id IS NOT NULL;
CREATE INDEX asset_folders_parent_idx ON public.asset_folders(parent_id);
CREATE INDEX asset_folders_path_idx ON public.asset_folders(path);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.asset_folders TO authenticated;
GRANT ALL ON public.asset_folders TO service_role;
GRANT SELECT ON public.asset_folders TO anon;
ALTER TABLE public.asset_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon read folders" ON public.asset_folders FOR SELECT TO anon USING (true);
CREATE POLICY "auth read folders" ON public.asset_folders FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write folders" ON public.asset_folders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

ALTER TABLE public.assets ADD CONSTRAINT assets_folder_fk FOREIGN KEY (folder_id) REFERENCES public.asset_folders(id) ON DELETE SET NULL;

-- Versions
CREATE TABLE public.asset_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  version_number int NOT NULL,
  storage_path text NOT NULL,
  size bigint,
  mime text,
  width int,
  height int,
  duration_seconds numeric,
  note text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(asset_id, version_number)
);
CREATE INDEX asset_versions_asset_idx ON public.asset_versions(asset_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.asset_versions TO authenticated;
GRANT ALL ON public.asset_versions TO service_role;
ALTER TABLE public.asset_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read versions" ON public.asset_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write versions" ON public.asset_versions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Usage tracking
CREATE TABLE public.asset_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  context text NOT NULL,
  ref_id text,
  ref_label text,
  ref_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(asset_id, context, ref_id)
);
CREATE INDEX asset_usage_asset_idx ON public.asset_usage(asset_id);
CREATE INDEX asset_usage_ctx_idx ON public.asset_usage(context, ref_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.asset_usage TO authenticated;
GRANT ALL ON public.asset_usage TO service_role;
ALTER TABLE public.asset_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read usage" ON public.asset_usage FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write usage" ON public.asset_usage FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Audit
CREATE TABLE public.asset_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid,
  folder_id uuid,
  action text NOT NULL,
  actor uuid,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX asset_audit_asset_idx ON public.asset_audit_log(asset_id);
CREATE INDEX asset_audit_time_idx ON public.asset_audit_log(created_at DESC);
GRANT SELECT, INSERT ON public.asset_audit_log TO authenticated;
GRANT ALL ON public.asset_audit_log TO service_role;
ALTER TABLE public.asset_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read audit" ON public.asset_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "auth insert audit" ON public.asset_audit_log FOR INSERT TO authenticated WITH CHECK (true);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.assets_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER assets_touch BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.assets_touch_updated_at();
CREATE TRIGGER folders_touch BEFORE UPDATE ON public.asset_folders FOR EACH ROW EXECUTE FUNCTION public.assets_touch_updated_at();

-- Seed first version for each existing asset
INSERT INTO public.asset_versions (asset_id, version_number, storage_path, size, mime, uploaded_by)
SELECT id, 1, storage_path, size, mime, uploaded_by FROM public.assets;

-- Helper: recompute usage count
CREATE OR REPLACE FUNCTION public.asset_recompute_usage(_asset_id uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c int;
BEGIN
  SELECT count(*) INTO c FROM public.asset_usage WHERE asset_id = _asset_id;
  UPDATE public.assets SET usage_count = c WHERE id = _asset_id;
  RETURN c;
END; $$;

-- Register usage (idempotent) + recompute count
CREATE OR REPLACE FUNCTION public.asset_register_usage(_asset_id uuid, _context text, _ref_id text, _ref_label text, _ref_url text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.asset_usage(asset_id, context, ref_id, ref_label, ref_url)
  VALUES (_asset_id, _context, _ref_id, _ref_label, _ref_url)
  ON CONFLICT (asset_id, context, ref_id) DO UPDATE SET ref_label = EXCLUDED.ref_label, ref_url = EXCLUDED.ref_url;
  PERFORM public.asset_recompute_usage(_asset_id);
END; $$;

CREATE OR REPLACE FUNCTION public.asset_unregister_usage(_asset_id uuid, _context text, _ref_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.asset_usage WHERE asset_id = _asset_id AND context = _context AND ref_id = _ref_id;
  PERFORM public.asset_recompute_usage(_asset_id);
END; $$;

-- Replace asset (adds a new version, updates head pointer)
CREATE OR REPLACE FUNCTION public.asset_replace(
  _asset_id uuid, _storage_path text, _size bigint, _mime text,
  _width int, _height int, _duration numeric, _note text
) RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE next_v int; uid uuid := auth.uid();
BEGIN
  IF NOT public.has_role(uid, 'super_admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT coalesce(max(version_number),0)+1 INTO next_v FROM public.asset_versions WHERE asset_id = _asset_id;
  INSERT INTO public.asset_versions(asset_id, version_number, storage_path, size, mime, width, height, duration_seconds, note, uploaded_by)
  VALUES (_asset_id, next_v, _storage_path, _size, _mime, _width, _height, _duration, _note, uid);
  UPDATE public.assets SET storage_path=_storage_path, size=_size, mime=coalesce(_mime,mime),
    width=coalesce(_width,width), height=coalesce(_height,height), duration_seconds=coalesce(_duration,duration_seconds),
    current_version=next_v, updated_by=uid WHERE id = _asset_id;
  INSERT INTO public.asset_audit_log(asset_id, action, actor, meta) VALUES (_asset_id, 'replaced', uid, jsonb_build_object('version',next_v,'note',_note));
  RETURN next_v;
END; $$;

-- Rollback to a specific version
CREATE OR REPLACE FUNCTION public.asset_rollback(_asset_id uuid, _version_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.asset_versions%ROWTYPE; uid uuid := auth.uid();
BEGIN
  IF NOT public.has_role(uid, 'super_admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT * INTO v FROM public.asset_versions WHERE id = _version_id AND asset_id = _asset_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Version not found'; END IF;
  UPDATE public.assets SET storage_path=v.storage_path, size=v.size, mime=coalesce(v.mime,mime),
    width=coalesce(v.width,width), height=coalesce(v.height,height), duration_seconds=coalesce(v.duration_seconds,duration_seconds),
    current_version=v.version_number, updated_by=uid WHERE id = _asset_id;
  INSERT INTO public.asset_audit_log(asset_id, action, actor, meta) VALUES (_asset_id, 'rolled_back', uid, jsonb_build_object('version',v.version_number));
END; $$;

-- Soft delete
CREATE OR REPLACE FUNCTION public.asset_soft_delete(_asset_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF NOT public.has_role(uid, 'super_admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.assets SET status='deleted', deleted_at=now(), updated_by=uid WHERE id=_asset_id;
  INSERT INTO public.asset_audit_log(asset_id, action, actor) VALUES (_asset_id, 'deleted', uid);
END; $$;

CREATE OR REPLACE FUNCTION public.asset_restore(_asset_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF NOT public.has_role(uid, 'super_admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.assets SET status='active', deleted_at=NULL, updated_by=uid WHERE id=_asset_id;
  INSERT INTO public.asset_audit_log(asset_id, action, actor) VALUES (_asset_id, 'restored', uid);
END; $$;

-- Dashboard stats
CREATE OR REPLACE FUNCTION public.asset_dashboard_stats()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM public.assets WHERE status='active'),
    'by_kind', (SELECT jsonb_object_agg(kind, c) FROM (SELECT kind, count(*) c FROM public.assets WHERE status='active' GROUP BY kind) k),
    'total_size', (SELECT coalesce(sum(size),0) FROM public.assets WHERE status='active'),
    'unused', (SELECT count(*) FROM public.assets WHERE status='active' AND usage_count=0),
    'deleted', (SELECT count(*) FROM public.assets WHERE status='deleted'),
    'folders', (SELECT count(*) FROM public.asset_folders),
    'recent_uploaded', (SELECT count(*) FROM public.assets WHERE status='active' AND created_at > now() - interval '7 days'),
    'recent_updated', (SELECT count(*) FROM public.assets WHERE status='active' AND updated_at > now() - interval '7 days' AND updated_at <> created_at)
  ) INTO r;
  RETURN r;
END; $$;
