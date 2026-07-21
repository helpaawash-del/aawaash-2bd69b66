
-- Amenities on projects (safe add)
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS amenities text[] NOT NULL DEFAULT '{}';

-- BUILDINGS
CREATE TABLE IF NOT EXISTS public.buildings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  total_floors integer NOT NULL DEFAULT 0,
  total_flats integer NOT NULL DEFAULT 0,
  ordering integer NOT NULL DEFAULT 0,
  cover_url text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, code)
);
GRANT SELECT ON public.buildings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buildings TO authenticated;
GRANT ALL ON public.buildings TO service_role;
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view buildings of public projects"
  ON public.buildings FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.is_deleted = false AND p.visibility = 'public'));

CREATE POLICY "Super admins manage buildings"
  ON public.buildings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE INDEX IF NOT EXISTS buildings_project_id_idx ON public.buildings(project_id);

-- FLOORS
CREATE TABLE IF NOT EXISTS public.floors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  number integer NOT NULL,
  name text,
  total_flats integer NOT NULL DEFAULT 0,
  floor_plan_url text,
  ordering integer NOT NULL DEFAULT 0,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(building_id, number)
);
GRANT SELECT ON public.floors TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.floors TO authenticated;
GRANT ALL ON public.floors TO service_role;
ALTER TABLE public.floors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view floors of public projects"
  ON public.floors FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.is_deleted = false AND p.visibility = 'public'));

CREATE POLICY "Super admins manage floors"
  ON public.floors FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE INDEX IF NOT EXISTS floors_building_id_idx ON public.floors(building_id);
CREATE INDEX IF NOT EXISTS floors_project_id_idx ON public.floors(project_id);

-- FLATS
CREATE TABLE IF NOT EXISTS public.flats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  floor_id uuid NOT NULL REFERENCES public.floors(id) ON DELETE CASCADE,
  unit_code text NOT NULL,
  area_sqft numeric(10,2),
  bedrooms integer NOT NULL DEFAULT 0,
  bathrooms integer NOT NULL DEFAULT 0,
  balconies integer NOT NULL DEFAULT 0,
  configuration text,
  facing text,
  price numeric(14,2),
  status text NOT NULL DEFAULT 'available',
  booking_status text NOT NULL DEFAULT 'open',
  construction_stage text,
  gallery jsonb NOT NULL DEFAULT '[]'::jsonb,
  floor_plan_url text,
  admin_notes text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, unit_code),
  CONSTRAINT flats_status_chk CHECK (status IN ('available','reserved','sold','not_released','blocked')),
  CONSTRAINT flats_booking_chk CHECK (booking_status IN ('open','locked','closed'))
);
GRANT SELECT ON public.flats TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flats TO authenticated;
GRANT ALL ON public.flats TO service_role;
ALTER TABLE public.flats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view flats of public projects"
  ON public.flats FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.is_deleted = false AND p.visibility = 'public'));

CREATE POLICY "Super admins manage flats"
  ON public.flats FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE INDEX IF NOT EXISTS flats_project_id_idx ON public.flats(project_id);
CREATE INDEX IF NOT EXISTS flats_building_id_idx ON public.flats(building_id);
CREATE INDEX IF NOT EXISTS flats_floor_id_idx ON public.flats(floor_id);
CREATE INDEX IF NOT EXISTS flats_status_idx ON public.flats(status);

-- FLAT LOCKS (temporary hold during checkout)
CREATE TABLE IF NOT EXISTS public.flat_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flat_id uuid NOT NULL REFERENCES public.flats(id) ON DELETE CASCADE,
  locked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text,
  expires_at timestamptz NOT NULL,
  released boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flat_locks TO authenticated;
GRANT ALL ON public.flat_locks TO service_role;
ALTER TABLE public.flat_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage flat locks"
  ON public.flat_locks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE INDEX IF NOT EXISTS flat_locks_flat_id_idx ON public.flat_locks(flat_id);

-- updated_at triggers
DROP TRIGGER IF EXISTS trg_buildings_updated ON public.buildings;
CREATE TRIGGER trg_buildings_updated BEFORE UPDATE ON public.buildings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_floors_updated ON public.floors;
CREATE TRIGGER trg_floors_updated BEFORE UPDATE ON public.floors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_flats_updated ON public.flats;
CREATE TRIGGER trg_flats_updated BEFORE UPDATE ON public.flats
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_flat_locks_updated ON public.flat_locks;
CREATE TRIGGER trg_flat_locks_updated BEFORE UPDATE ON public.flat_locks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Recompute project + building + floor totals when flats change
CREATE OR REPLACE FUNCTION public.recompute_project_flat_counts(p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.projects p SET
    total_flats     = COALESCE(s.total, 0),
    available_flats = COALESCE(s.available, 0),
    reserved_flats  = COALESCE(s.reserved, 0),
    sold_flats      = COALESCE(s.sold, 0),
    total_buildings = COALESCE(b.building_count, p.total_buildings),
    total_floors    = COALESCE(f.floor_count, p.total_floors)
  FROM (
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'available')::int AS available,
      COUNT(*) FILTER (WHERE status = 'reserved')::int AS reserved,
      COUNT(*) FILTER (WHERE status = 'sold')::int AS sold
    FROM public.flats WHERE project_id = p_project_id
  ) s,
  (SELECT COUNT(*)::int AS building_count FROM public.buildings WHERE project_id = p_project_id) b,
  (SELECT COUNT(*)::int AS floor_count FROM public.floors WHERE project_id = p_project_id) f
  WHERE p.id = p_project_id;

  UPDATE public.buildings bl SET total_flats = sub.n
  FROM (SELECT building_id, COUNT(*)::int AS n FROM public.flats WHERE project_id = p_project_id GROUP BY building_id) sub
  WHERE bl.id = sub.building_id;

  UPDATE public.floors fl SET total_flats = sub.n
  FROM (SELECT floor_id, COUNT(*)::int AS n FROM public.flats WHERE project_id = p_project_id GROUP BY floor_id) sub
  WHERE fl.id = sub.floor_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.flats_sync_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_project_flat_counts(OLD.project_id);
    RETURN OLD;
  ELSE
    PERFORM public.recompute_project_flat_counts(NEW.project_id);
    IF TG_OP = 'UPDATE' AND OLD.project_id <> NEW.project_id THEN
      PERFORM public.recompute_project_flat_counts(OLD.project_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_flats_sync ON public.flats;
CREATE TRIGGER trg_flats_sync
  AFTER INSERT OR UPDATE OR DELETE ON public.flats
  FOR EACH ROW EXECUTE FUNCTION public.flats_sync_counts();

-- Realtime
ALTER TABLE public.buildings REPLICA IDENTITY FULL;
ALTER TABLE public.floors    REPLICA IDENTITY FULL;
ALTER TABLE public.flats     REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.buildings; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.floors;    EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.flats;     EXCEPTION WHEN duplicate_object THEN NULL; END;
END$$;
