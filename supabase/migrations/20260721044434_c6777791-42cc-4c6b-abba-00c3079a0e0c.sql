
-- =========================
-- PROJECTS
-- =========================
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  location text NOT NULL,
  price_from numeric(14,2) NOT NULL DEFAULT 0,
  total_units integer NOT NULL DEFAULT 0,
  sold_units integer NOT NULL DEFAULT 0,
  hero_hue text NOT NULL DEFAULT 'from-primary/30 to-leaf/25',
  tag text,
  description text,
  status text NOT NULL DEFAULT 'live',
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects: authenticated read live" ON public.projects
  FOR SELECT TO authenticated USING (is_deleted = false);
CREATE POLICY "projects: super admin manages" ON public.projects
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));
CREATE TRIGGER projects_set_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================
-- SALES
-- =========================
CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  seller_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  buyer_name text NOT NULL,
  buyer_mobile text,
  unit_label text,
  deal_value numeric(14,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'confirmed',
  sale_date date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sales_team_id_idx ON public.sales(team_id);
CREATE INDEX sales_seller_id_idx ON public.sales(seller_id);
CREATE INDEX sales_sale_date_idx ON public.sales(sale_date DESC);
GRANT SELECT ON public.sales TO authenticated;
GRANT ALL ON public.sales TO service_role;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sales: readable to owner, team leader, admin" ON public.sales
  FOR SELECT TO authenticated USING (
    seller_id = auth.uid()
    OR has_role(auth.uid(), 'super_admin')
    OR (
      has_role(auth.uid(), 'team_leader')
      AND team_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid())
    )
  );
CREATE POLICY "sales: super admin manages" ON public.sales
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- =========================
-- COMMISSIONS
-- =========================
CREATE TABLE public.commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES public.sales(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  tier integer NOT NULL DEFAULT 1,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX commissions_user_id_idx ON public.commissions(user_id);
CREATE INDEX commissions_team_id_idx ON public.commissions(team_id);
GRANT SELECT ON public.commissions TO authenticated;
GRANT ALL ON public.commissions TO service_role;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "commissions: readable to owner, team leader, admin" ON public.commissions
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'super_admin')
    OR (
      has_role(auth.uid(), 'team_leader')
      AND team_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid())
    )
  );
CREATE POLICY "commissions: super admin manages" ON public.commissions
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- =========================
-- WITHDRAWALS
-- =========================
CREATE TABLE public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  amount numeric(14,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  note text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
CREATE INDEX withdrawals_user_id_idx ON public.withdrawals(user_id);
CREATE INDEX withdrawals_team_id_idx ON public.withdrawals(team_id);
GRANT SELECT, INSERT ON public.withdrawals TO authenticated;
GRANT ALL ON public.withdrawals TO service_role;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "withdrawals: readable to owner, team leader, admin" ON public.withdrawals
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'super_admin')
    OR (
      has_role(auth.uid(), 'team_leader')
      AND team_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid())
    )
  );
CREATE POLICY "withdrawals: owner inserts own" ON public.withdrawals
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "withdrawals: super admin manages" ON public.withdrawals
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- =========================
-- NOTIFICATIONS
-- =========================
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'general',
  title text NOT NULL,
  body text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_id_idx ON public.notifications(user_id, is_read, created_at DESC);
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications: owner reads" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications: owner updates own" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "notifications: owner deletes own" ON public.notifications
  FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications: super admin manages" ON public.notifications
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- =========================
-- SEED PROJECTS
-- =========================
INSERT INTO public.projects (name, slug, location, price_from, total_units, sold_units, hero_hue, tag, description) VALUES
  ('The Serai Residences', 'the-serai-residences', 'Whitefield, Bengaluru', 18500000, 240, 96, 'from-primary/30 to-leaf/25', 'New Launch',
   'A curated collection of 3 & 4 BHK garden residences framed by a private forest walk.'),
  ('Aawash Skyline', 'aawash-skyline', 'Andheri West, Mumbai', 32500000, 180, 74, 'from-gold/25 to-primary/20', 'Premium',
   'Sky-high 2 & 3 BHK apartments overlooking the western coastline.'),
  ('Verdant Heights', 'verdant-heights', 'Sector 62, Noida', 11500000, 320, 168, 'from-leaf/25 to-primary/25', 'Ready to Move',
   'Ready-to-move 2, 3 & 4 BHK homes in a mature, tree-lined neighbourhood.');
