
-- ============================================================
-- CRM: customer lifecycle enum
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.customer_status AS ENUM (
    'new_lead','contacted','meeting_scheduled','meeting_completed',
    'interested','flat_selected','price_discussion','documentation',
    'booking_amount','booking_confirmed','agreement','registration',
    'sale_completed','commission_generated','closed',
    'not_interested','on_hold','cancelled','lost','future_followup'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.customer_priority AS ENUM ('low','normal','high','vip');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.meeting_status AS ENUM ('scheduled','completed','cancelled','missed','rescheduled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.meeting_type AS ENUM ('call','in_person','site_visit','virtual','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- Helper: is caller the team leader of a given team?
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_team_leader_of(_team_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teams
    WHERE id = _team_id AND leader_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.my_team_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT team_id FROM public.profiles WHERE id = auth.uid()
$$;

-- ============================================================
-- Sequence + generator for human customer code
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS public.customer_code_seq START 1;

-- ============================================================
-- customers
-- ============================================================
CREATE TABLE IF NOT EXISTS public.customers (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_code         text NOT NULL UNIQUE
                         DEFAULT ('C-' || lpad(nextval('public.customer_code_seq')::text, 6, '0')),
  full_name             text NOT NULL,
  mobile_number         text NOT NULL,
  alt_mobile_number     text,
  email                 text,
  address               text,
  city                  text,
  state                 text,
  country               text DEFAULT 'India',
  pin_code              text,
  occupation            text,
  company               text,
  monthly_income        numeric(14,2),
  budget_min            numeric(14,2),
  budget_max            numeric(14,2),
  preferred_project_id  uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  preferred_flat_id     uuid REFERENCES public.flats(id) ON DELETE SET NULL,
  preferred_area        text,
  preferred_config      text,
  lead_source           text,
  status                public.customer_status NOT NULL DEFAULT 'new_lead',
  priority              public.customer_priority NOT NULL DEFAULT 'normal',
  assigned_member_id    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_leader_id    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  team_id               uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  tags                  text[] NOT NULL DEFAULT '{}',
  purchase_probability  int CHECK (purchase_probability BETWEEN 0 AND 100),
  expected_purchase_date date,
  last_contact_at       timestamptz,
  next_followup_at      timestamptz,
  meeting_count         int NOT NULL DEFAULT 0,
  notes                 text,
  meta                  jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_archived           boolean NOT NULL DEFAULT false,
  created_by            uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by            uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customers_mobile_idx        ON public.customers (mobile_number);
CREATE INDEX IF NOT EXISTS customers_alt_mobile_idx    ON public.customers (alt_mobile_number);
CREATE INDEX IF NOT EXISTS customers_email_idx         ON public.customers (lower(email));
CREATE INDEX IF NOT EXISTS customers_member_idx        ON public.customers (assigned_member_id);
CREATE INDEX IF NOT EXISTS customers_team_idx          ON public.customers (team_id);
CREATE INDEX IF NOT EXISTS customers_status_idx        ON public.customers (status);
CREATE INDEX IF NOT EXISTS customers_next_followup_idx ON public.customers (next_followup_at);

GRANT SELECT, INSERT, UPDATE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers admin all"
  ON public.customers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "customers leader read team"
  ON public.customers FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'team_leader')
    AND team_id IS NOT NULL
    AND team_id = public.my_team_id()
  );

CREATE POLICY "customers leader update team"
  ON public.customers FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(),'team_leader')
    AND team_id IS NOT NULL
    AND team_id = public.my_team_id()
  )
  WITH CHECK (
    team_id = public.my_team_id()
  );

CREATE POLICY "customers member read own"
  ON public.customers FOR SELECT TO authenticated
  USING (assigned_member_id = auth.uid());

CREATE POLICY "customers member insert own"
  ON public.customers FOR INSERT TO authenticated
  WITH CHECK (
    assigned_member_id = auth.uid()
    AND (team_id IS NULL OR team_id = public.my_team_id())
  );

CREATE POLICY "customers member update own"
  ON public.customers FOR UPDATE TO authenticated
  USING (assigned_member_id = auth.uid())
  WITH CHECK (assigned_member_id = auth.uid());

CREATE TRIGGER customers_touch
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- customer_meetings
-- ============================================================
CREATE TABLE IF NOT EXISTS public.customer_meetings (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id    uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  project_id     uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  scheduled_at   timestamptz NOT NULL,
  location       text,
  meeting_type   public.meeting_type NOT NULL DEFAULT 'call',
  status         public.meeting_status NOT NULL DEFAULT 'scheduled',
  outcome        text,
  remarks        text,
  reminder_at    timestamptz,
  followup_at    timestamptz,
  created_by     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS meetings_customer_idx ON public.customer_meetings (customer_id);
CREATE INDEX IF NOT EXISTS meetings_scheduled_idx ON public.customer_meetings (scheduled_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_meetings TO authenticated;
GRANT ALL ON public.customer_meetings TO service_role;
ALTER TABLE public.customer_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meetings admin all"
  ON public.customer_meetings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "meetings visible via parent"
  ON public.customer_meetings FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id));

CREATE POLICY "meetings insert via parent"
  ON public.customer_meetings FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id));

CREATE POLICY "meetings update via parent"
  ON public.customer_meetings FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id));

CREATE TRIGGER meetings_touch
  BEFORE UPDATE ON public.customer_meetings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- customer_notes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.customer_notes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id    uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  author_id      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  content        text NOT NULL,
  is_pinned      boolean NOT NULL DEFAULT false,
  visibility     text NOT NULL DEFAULT 'team',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notes_customer_idx ON public.customer_notes (customer_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_notes TO authenticated;
GRANT ALL ON public.customer_notes TO service_role;
ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notes admin all"
  ON public.customer_notes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "notes visible via parent"
  ON public.customer_notes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id));

CREATE POLICY "notes insert via parent"
  ON public.customer_notes FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id));

CREATE POLICY "notes update own"
  ON public.customer_notes FOR UPDATE TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

CREATE TRIGGER notes_touch
  BEFORE UPDATE ON public.customer_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- customer_timeline (immutable event log)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.customer_timeline (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id    uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  actor_id       uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  event          text NOT NULL,
  detail         text,
  metadata       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS timeline_customer_idx ON public.customer_timeline (customer_id, created_at DESC);

GRANT SELECT, INSERT ON public.customer_timeline TO authenticated;
GRANT ALL ON public.customer_timeline TO service_role;
ALTER TABLE public.customer_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "timeline visible via parent"
  ON public.customer_timeline FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id));

CREATE POLICY "timeline insert via parent"
  ON public.customer_timeline FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id));

-- ============================================================
-- Realtime
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_meetings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_timeline;
