-- Extend sales with tracking columns
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS customer_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS contact_visible boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notes text;

-- ============ REFERRALS ============
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  mobile_number text NOT NULL,
  alt_mobile text,
  address text,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  interested_project text,
  preferred_budget numeric(14,2),
  preferred_flat text,
  meeting_notes text,
  expected_timeline text,
  remarks text,
  status text NOT NULL DEFAULT 'pending',
  meeting_status text NOT NULL DEFAULT 'not_scheduled',
  purchase_status text NOT NULL DEFAULT 'open',
  potential_commission numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS referrals_member_idx ON public.referrals(member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS referrals_team_idx ON public.referrals(team_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referrals: member manages own"
  ON public.referrals FOR ALL TO authenticated
  USING (member_id = auth.uid())
  WITH CHECK (member_id = auth.uid());

CREATE POLICY "referrals: team leader reads team"
  ON public.referrals FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'team_leader')
    AND team_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "referrals: super admin manages"
  ON public.referrals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER referrals_updated_at
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ TIP PERSONS ============
CREATE TABLE IF NOT EXISTS public.tip_persons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  tip_name text NOT NULL,
  tip_mobile text NOT NULL,
  tip_address text,
  relationship text,
  customer_name text NOT NULL,
  customer_contact text,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  interested_project text,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tip_persons_member_idx ON public.tip_persons(member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS tip_persons_team_idx ON public.tip_persons(team_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tip_persons TO authenticated;
GRANT ALL ON public.tip_persons TO service_role;

ALTER TABLE public.tip_persons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tips: member manages own"
  ON public.tip_persons FOR ALL TO authenticated
  USING (member_id = auth.uid())
  WITH CHECK (member_id = auth.uid());

CREATE POLICY "tips: team leader reads team"
  ON public.tip_persons FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'team_leader')
    AND team_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "tips: super admin manages"
  ON public.tip_persons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER tip_persons_updated_at
  BEFORE UPDATE ON public.tip_persons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();