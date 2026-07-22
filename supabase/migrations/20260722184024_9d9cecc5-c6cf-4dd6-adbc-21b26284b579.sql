-- CMS: pages, versions, media, brand, global content, audit
CREATE TABLE public.cms_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','private','scheduled')),
  seo_title text,
  seo_description text,
  seo_keywords text,
  og_image text,
  canonical_url text,
  current_version_id uuid,
  published_version_id uuid,
  visible_from timestamptz,
  visible_until timestamptz,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cms_pages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cms_pages TO authenticated;
GRANT ALL ON public.cms_pages TO service_role;
ALTER TABLE public.cms_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read published pages" ON public.cms_pages FOR SELECT TO anon USING (status = 'published');
CREATE POLICY "auth read all pages" ON public.cms_pages FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage pages" ON public.cms_pages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

CREATE TABLE public.cms_page_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES public.cms_pages(id) ON DELETE CASCADE,
  version_number int NOT NULL,
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  seo jsonb NOT NULL DEFAULT '{}'::jsonb,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (page_id, version_number)
);
CREATE INDEX cms_page_versions_page_idx ON public.cms_page_versions(page_id, version_number DESC);
GRANT SELECT ON public.cms_page_versions TO anon;
GRANT SELECT, INSERT ON public.cms_page_versions TO authenticated;
GRANT ALL ON public.cms_page_versions TO service_role;
ALTER TABLE public.cms_page_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon read published version" ON public.cms_page_versions FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.cms_pages p WHERE p.id = page_id AND p.status='published' AND p.published_version_id = cms_page_versions.id));
CREATE POLICY "auth read versions" ON public.cms_page_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write versions" ON public.cms_page_versions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

CREATE TABLE public.cms_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'image' CHECK (kind IN ('image','video','pdf','svg','lottie','model','other')),
  storage_path text NOT NULL,
  filename text NOT NULL,
  size bigint,
  mime text,
  category text,
  alt text,
  is_public boolean NOT NULL DEFAULT true,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cms_media TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cms_media TO authenticated;
GRANT ALL ON public.cms_media TO service_role;
ALTER TABLE public.cms_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon read public media" ON public.cms_media FOR SELECT TO anon USING (is_public = true);
CREATE POLICY "auth read media" ON public.cms_media FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write media" ON public.cms_media FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

CREATE TABLE public.cms_brand_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  colors jsonb NOT NULL DEFAULT '{}'::jsonb,
  fonts jsonb NOT NULL DEFAULT '{}'::jsonb,
  radii jsonb NOT NULL DEFAULT '{}'::jsonb,
  shadows jsonb NOT NULL DEFAULT '{}'::jsonb,
  gradients jsonb NOT NULL DEFAULT '{}'::jsonb,
  logo_url text,
  logo_dark_url text,
  favicon_url text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cms_brand_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.cms_brand_settings TO authenticated;
GRANT ALL ON public.cms_brand_settings TO service_role;
ALTER TABLE public.cms_brand_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read brand" ON public.cms_brand_settings FOR SELECT USING (true);
CREATE POLICY "admin write brand" ON public.cms_brand_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));
INSERT INTO public.cms_brand_settings (id, colors, fonts) VALUES
  (1, '{"primary":"oklch(0.62 0.19 145)","accent":"oklch(0.75 0.15 90)"}'::jsonb,
      '{"display":"Inter","body":"Inter"}'::jsonb);

CREATE TABLE public.cms_global_content (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  label text,
  category text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cms_global_content TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cms_global_content TO authenticated;
GRANT ALL ON public.cms_global_content TO service_role;
ALTER TABLE public.cms_global_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read global content" ON public.cms_global_content FOR SELECT USING (true);
CREATE POLICY "admin write global content" ON public.cms_global_content FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

INSERT INTO public.cms_global_content (key, value, label, category) VALUES
  ('company', '{"name":"Aawash","tagline":"Premium real estate"}'::jsonb, 'Company', 'company'),
  ('contact', '{"email":"hello@aawash.com","phone":"+91 00000 00000","address":""}'::jsonb, 'Contact', 'contact'),
  ('socials', '{"instagram":"","facebook":"","linkedin":"","youtube":"","twitter":""}'::jsonb, 'Social Media', 'social'),
  ('nav', '{"items":[{"label":"Home","href":"/"},{"label":"Projects","href":"/projects"},{"label":"About","href":"/about"},{"label":"Contact","href":"/contact"}]}'::jsonb, 'Navigation', 'nav'),
  ('footer', '{"columns":[],"copyright":"© Aawash. All rights reserved."}'::jsonb, 'Footer', 'footer'),
  ('announcement', '{"enabled":false,"text":"","href":""}'::jsonb, 'Announcement Bar', 'marketing'),
  ('stats', '{"items":[{"label":"Projects","value":"20+"},{"label":"Happy families","value":"1000+"}]}'::jsonb, 'Statistics', 'marketing'),
  ('testimonials', '{"items":[]}'::jsonb, 'Testimonials', 'marketing'),
  ('legal', '{"privacy_url":"/privacy","terms_url":"/terms"}'::jsonb, 'Legal', 'legal');

CREATE TABLE public.cms_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  actor_id uuid,
  before jsonb,
  after jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.cms_audit_log TO authenticated;
GRANT ALL ON public.cms_audit_log TO service_role;
ALTER TABLE public.cms_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read audit" ON public.cms_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "admin write audit" ON public.cms_audit_log FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.cms_touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER cms_pages_touch BEFORE UPDATE ON public.cms_pages FOR EACH ROW EXECUTE FUNCTION public.cms_touch_updated_at();
CREATE TRIGGER cms_brand_touch BEFORE UPDATE ON public.cms_brand_settings FOR EACH ROW EXECUTE FUNCTION public.cms_touch_updated_at();
CREATE TRIGGER cms_global_touch BEFORE UPDATE ON public.cms_global_content FOR EACH ROW EXECUTE FUNCTION public.cms_touch_updated_at();

-- RPC: save draft (creates a new version, sets current_version_id)
CREATE OR REPLACE FUNCTION public.cms_save_draft(_page_id uuid, _blocks jsonb, _seo jsonb, _note text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _next int; _vid uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT COALESCE(MAX(version_number),0)+1 INTO _next FROM public.cms_page_versions WHERE page_id=_page_id;
  INSERT INTO public.cms_page_versions (page_id, version_number, blocks, seo, note, created_by)
    VALUES (_page_id, _next, COALESCE(_blocks,'[]'::jsonb), COALESCE(_seo,'{}'::jsonb), _note, auth.uid())
    RETURNING id INTO _vid;
  UPDATE public.cms_pages SET current_version_id = _vid, updated_by = auth.uid(), updated_at = now() WHERE id = _page_id;
  INSERT INTO public.cms_audit_log (entity_type, entity_id, action, actor_id, after)
    VALUES ('page', _page_id, 'draft_saved', auth.uid(), jsonb_build_object('version_id',_vid,'version',_next));
  RETURN _vid;
END; $$;

-- RPC: publish page (marks current version as published)
CREATE OR REPLACE FUNCTION public.cms_publish_page(_page_id uuid, _note text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _vid uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT current_version_id INTO _vid FROM public.cms_pages WHERE id = _page_id;
  IF _vid IS NULL THEN RAISE EXCEPTION 'no current version to publish'; END IF;
  UPDATE public.cms_pages
    SET published_version_id = _vid, status = 'published', updated_by = auth.uid(), updated_at = now()
    WHERE id = _page_id;
  INSERT INTO public.cms_audit_log (entity_type, entity_id, action, actor_id, after)
    VALUES ('page', _page_id, 'published', auth.uid(), jsonb_build_object('version_id',_vid,'note',_note));
  RETURN _vid;
END; $$;

-- RPC: rollback to a specific version (copies its content into a new version)
CREATE OR REPLACE FUNCTION public.cms_rollback_page(_page_id uuid, _version_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _blocks jsonb; _seo jsonb; _next int; _newvid uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT blocks, seo INTO _blocks, _seo FROM public.cms_page_versions WHERE id = _version_id AND page_id = _page_id;
  IF _blocks IS NULL THEN RAISE EXCEPTION 'version not found'; END IF;
  SELECT COALESCE(MAX(version_number),0)+1 INTO _next FROM public.cms_page_versions WHERE page_id=_page_id;
  INSERT INTO public.cms_page_versions (page_id, version_number, blocks, seo, note, created_by)
    VALUES (_page_id, _next, _blocks, _seo, 'Rollback to version '||_version_id::text, auth.uid())
    RETURNING id INTO _newvid;
  UPDATE public.cms_pages SET current_version_id = _newvid, updated_by = auth.uid(), updated_at = now() WHERE id = _page_id;
  INSERT INTO public.cms_audit_log (entity_type, entity_id, action, actor_id, after)
    VALUES ('page', _page_id, 'rolled_back', auth.uid(), jsonb_build_object('from_version_id',_version_id,'new_version_id',_newvid));
  RETURN _newvid;
END; $$;

GRANT EXECUTE ON FUNCTION public.cms_save_draft(uuid, jsonb, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cms_publish_page(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cms_rollback_page(uuid, uuid) TO authenticated;