
-- =========================================================================
-- ENUMS
-- =========================================================================
CREATE TYPE public.app_role AS ENUM ('super_admin', 'team_leader', 'member');
CREATE TYPE public.account_status AS ENUM ('active', 'suspended', 'pending');

-- =========================================================================
-- HELPER: updated_at trigger
-- =========================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =========================================================================
-- TABLE: teams
-- =========================================================================
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  letter TEXT NOT NULL UNIQUE CHECK (length(letter) = 1 AND letter ~ '^[A-Z]$'),
  name TEXT NOT NULL,
  description TEXT,
  leader_id UUID, -- FK added after profiles table exists
  status public.account_status NOT NULL DEFAULT 'active',
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT ALL ON public.teams TO service_role;

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER teams_set_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed the three initial teams (scalable — more can be added later)
INSERT INTO public.teams (letter, name, description) VALUES
  ('A', 'Team A', 'Aawash Sales Team A'),
  ('B', 'Team B', 'Aawash Sales Team B'),
  ('C', 'Team C', 'Aawash Sales Team C');

-- =========================================================================
-- TABLE: profiles
-- =========================================================================
CREATE SEQUENCE public.user_display_code_seq START 1;

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_code TEXT NOT NULL UNIQUE
    DEFAULT ('USR-' || lpad(nextval('public.user_display_code_seq')::text, 6, '0')),
  full_name TEXT NOT NULL DEFAULT '',
  mobile_number TEXT NOT NULL UNIQUE
    CHECK (mobile_number ~ '^[0-9]{10}$'),
  login_id TEXT NOT NULL UNIQUE,
  email TEXT,
  avatar_url TEXT,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  wallet_balance NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_earnings NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_sales NUMERIC(14, 2) NOT NULL DEFAULT 0,
  referral_count INTEGER NOT NULL DEFAULT 0,
  status public.account_status NOT NULL DEFAULT 'active',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

CREATE INDEX profiles_team_id_idx ON public.profiles(team_id);
CREATE INDEX profiles_login_id_idx ON public.profiles(login_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Add leader_id FK on teams now that profiles exists
ALTER TABLE public.teams
  ADD CONSTRAINT teams_leader_id_fkey
  FOREIGN KEY (leader_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- =========================================================================
-- TABLE: user_roles  (SEPARATE from profiles — required for security)
-- =========================================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  granted_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- SECURITY DEFINER: has_role  (used in all policies)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = auth.uid()
  ORDER BY CASE role
    WHEN 'super_admin' THEN 1
    WHEN 'team_leader' THEN 2
    WHEN 'member' THEN 3
  END
  LIMIT 1
$$;

-- =========================================================================
-- RLS POLICIES: profiles
-- =========================================================================
CREATE POLICY "profiles: own row is readable"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles: super admin reads all"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "profiles: team leader reads own team"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'team_leader')
    AND team_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "profiles: user updates safe fields on own row"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles: super admin manages all"
  ON public.profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- =========================================================================
-- RLS POLICIES: teams
-- =========================================================================
CREATE POLICY "teams: authenticated read"
  ON public.teams FOR SELECT TO authenticated
  USING (is_deleted = false);

CREATE POLICY "teams: super admin manages"
  ON public.teams FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- =========================================================================
-- RLS POLICIES: user_roles
-- =========================================================================
CREATE POLICY "user_roles: read own"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_roles: super admin reads all"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "user_roles: super admin manages"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- =========================================================================
-- TABLE: audit_logs
-- =========================================================================
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  previous_value JSONB,
  new_value JSONB,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX audit_logs_actor_id_idx ON public.audit_logs(actor_id);
CREATE INDEX audit_logs_entity_idx ON public.audit_logs(entity_type, entity_id);
CREATE INDEX audit_logs_created_at_idx ON public.audit_logs(created_at DESC);

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs: super admin reads"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "audit_logs: authenticated inserts own action"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());

-- =========================================================================
-- TRIGGER: handle_new_user — create profile & default role on signup
-- =========================================================================
-- Expects raw_user_meta_data to contain: full_name, mobile_number, login_id, team_letter (optional), role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_full_name TEXT := COALESCE(meta->>'full_name', '');
  v_mobile TEXT := COALESCE(meta->>'mobile_number', '');
  v_login_id TEXT := COALESCE(meta->>'login_id', '');
  v_team_letter TEXT := meta->>'team_letter';
  v_role public.app_role := COALESCE((meta->>'role')::public.app_role, 'member');
  v_team_id UUID;
BEGIN
  -- Skip if profile already exists (idempotent)
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Fall back to email prefix if metadata missing (safety)
  IF v_mobile = '' THEN
    v_mobile := regexp_replace(split_part(NEW.email, '@', 1), '[^0-9]', '', 'g');
    IF length(v_mobile) < 10 THEN
      v_mobile := lpad(v_mobile, 10, '0');
    END IF;
  END IF;

  IF v_login_id = '' THEN
    v_login_id := COALESCE(v_team_letter, '') || v_mobile;
  END IF;

  IF v_team_letter IS NOT NULL THEN
    SELECT id INTO v_team_id FROM public.teams WHERE letter = v_team_letter;
  END IF;

  INSERT INTO public.profiles (id, full_name, mobile_number, login_id, email, team_id)
  VALUES (NEW.id, v_full_name, v_mobile, v_login_id, NEW.email, v_team_id);

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
