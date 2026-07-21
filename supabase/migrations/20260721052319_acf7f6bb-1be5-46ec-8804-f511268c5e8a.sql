
-- 1. Extend projects table with enterprise fields
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS project_type text NOT NULL DEFAULT 'flat_inventory',
  ADD COLUMN IF NOT EXISTS short_description text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS latitude numeric(10,7),
  ADD COLUMN IF NOT EXISTS longitude numeric(10,7),
  ADD COLUMN IF NOT EXISTS google_map_url text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS hero_banner_url text,
  ADD COLUMN IF NOT EXISTS cover_url text,
  ADD COLUMN IF NOT EXISTS gallery_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS video_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS model_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS floor_plan_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS construction_status text NOT NULL DEFAULT 'planning',
  ADD COLUMN IF NOT EXISTS launch_date date,
  ADD COLUMN IF NOT EXISTS possession_date date,
  ADD COLUMN IF NOT EXISTS completion_percent integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_min numeric(14,2),
  ADD COLUMN IF NOT EXISTS price_max numeric(14,2),
  ADD COLUMN IF NOT EXISTS area_min numeric(12,2),
  ADD COLUMN IF NOT EXISTS area_max numeric(12,2),
  ADD COLUMN IF NOT EXISTS total_buildings integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS total_floors integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_flats integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS available_flats integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reserved_flats integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sold_flats integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS display_priority integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS seo_description text,
  ADD COLUMN IF NOT EXISTS extra jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Completion percent bounds
ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_completion_percent_range,
  ADD CONSTRAINT projects_completion_percent_range
    CHECK (completion_percent BETWEEN 0 AND 100);

-- Flat inventory consistency: available + reserved + sold <= total_flats
ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_flat_balance,
  ADD CONSTRAINT projects_flat_balance
    CHECK (available_flats + reserved_flats + sold_flats <= total_flats OR total_flats = 0);

-- Visibility whitelist
ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_visibility_values,
  ADD CONSTRAINT projects_visibility_values
    CHECK (visibility IN ('public','internal','draft','archived'));

-- Construction status whitelist
ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_construction_status_values,
  ADD CONSTRAINT projects_construction_status_values
    CHECK (construction_status IN ('planning','pre_launch','under_construction','nearing_completion','ready_to_move','completed','on_hold'));

-- Indexes for search/filter
CREATE INDEX IF NOT EXISTS projects_visibility_idx ON public.projects(visibility) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS projects_priority_idx ON public.projects(display_priority DESC, created_at DESC) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS projects_status_idx ON public.projects(construction_status);
CREATE INDEX IF NOT EXISTS projects_name_idx ON public.projects USING gin (to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(location,'') || ' ' || coalesce(address,'')));

-- 2. Public read policy (anon can see public, non-deleted projects)
DROP POLICY IF EXISTS "projects: public read" ON public.projects;
CREATE POLICY "projects: public read" ON public.projects
  FOR SELECT
  TO anon
  USING (is_deleted = false AND visibility = 'public');

GRANT SELECT ON public.projects TO anon;

-- 3. Favorites table
CREATE TABLE IF NOT EXISTS public.project_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, project_id)
);

GRANT SELECT, INSERT, DELETE ON public.project_favorites TO authenticated;
GRANT ALL ON public.project_favorites TO service_role;

ALTER TABLE public.project_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "favorites: own read" ON public.project_favorites;
CREATE POLICY "favorites: own read" ON public.project_favorites
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "favorites: own insert" ON public.project_favorites;
CREATE POLICY "favorites: own insert" ON public.project_favorites
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "favorites: own delete" ON public.project_favorites;
CREATE POLICY "favorites: own delete" ON public.project_favorites
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS project_favorites_user_idx ON public.project_favorites(user_id);
CREATE INDEX IF NOT EXISTS project_favorites_project_idx ON public.project_favorites(project_id);

-- 4. Realtime for projects
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'projects'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.projects';
  END IF;
END $$;

-- 5. Seed initial projects (idempotent)
INSERT INTO public.projects (
  slug, name, location, address, project_type, construction_status, visibility, display_priority,
  short_description, description, tag,
  price_from, price_min, price_max,
  total_buildings, total_floors, total_flats, available_flats, reserved_flats, sold_flats,
  total_units, sold_units, completion_percent,
  hero_hue, seo_title, seo_description
) VALUES
(
  'mirzapur-tower', 'Mirzapur Tower', 'Mirzapur',
  'Mirzapur, Uttar Pradesh',
  'entire_building', 'under_construction', 'public', 100,
  'A landmark residential tower in the heart of Mirzapur.',
  'Mirzapur Tower is a signature entire-building development by Aawash, designed for modern families seeking timeless elegance and premium urban living.',
  'Signature',
  4500000, 4500000, 12500000,
  1, 12, 48, 48, 0, 0,
  48, 0, 35,
  'from-primary/30 to-leaf/25',
  'Mirzapur Tower — Aawash', 'Premium residential tower in Mirzapur by Aawash.'
),
(
  'chandanpatti', 'Chandanpatti', 'Chandanpatti',
  'Chandanpatti, Bihar',
  'flat_inventory', 'under_construction', 'public', 90,
  '112 thoughtfully designed flats across a serene neighbourhood.',
  'Chandanpatti offers 112 elegantly crafted flats with modern amenities, curated green spaces, and best-in-class construction quality.',
  '112 Flats',
  3200000, 3200000, 8500000,
  4, 7, 112, 112, 0, 0,
  112, 0, 25,
  'from-secondary/40 to-gold/25',
  'Chandanpatti — Aawash', '112 premium flats at Chandanpatti by Aawash.'
)
ON CONFLICT (slug) DO UPDATE SET
  project_type = EXCLUDED.project_type,
  address = EXCLUDED.address,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  tag = EXCLUDED.tag,
  price_min = EXCLUDED.price_min,
  price_max = EXCLUDED.price_max,
  total_buildings = EXCLUDED.total_buildings,
  total_floors = EXCLUDED.total_floors,
  total_flats = EXCLUDED.total_flats,
  available_flats = EXCLUDED.available_flats,
  reserved_flats = EXCLUDED.reserved_flats,
  sold_flats = EXCLUDED.sold_flats,
  completion_percent = EXCLUDED.completion_percent,
  construction_status = EXCLUDED.construction_status,
  seo_title = EXCLUDED.seo_title,
  seo_description = EXCLUDED.seo_description,
  updated_at = now();
