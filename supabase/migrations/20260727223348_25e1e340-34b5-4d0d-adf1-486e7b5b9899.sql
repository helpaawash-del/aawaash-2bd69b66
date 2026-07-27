
-- 1) Helper: does the submitted row keep all protected columns identical to what is stored?
CREATE OR REPLACE FUNCTION public.profiles_protected_unchanged(
  _id uuid,
  _wallet_balance numeric,
  _pending_balance numeric,
  _locked_balance numeric,
  _total_earnings numeric,
  _total_sales numeric,
  _lifetime_withdrawals numeric,
  _status public.account_status,
  _is_active boolean,
  _is_deleted boolean,
  _login_id text,
  _display_code text,
  _team_id uuid,
  _mobile_number text,
  _email text,
  _metrics_override jsonb,
  _referral_count integer
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _id
      AND p.wallet_balance IS NOT DISTINCT FROM _wallet_balance
      AND p.pending_balance IS NOT DISTINCT FROM _pending_balance
      AND p.locked_balance IS NOT DISTINCT FROM _locked_balance
      AND p.total_earnings IS NOT DISTINCT FROM _total_earnings
      AND p.total_sales IS NOT DISTINCT FROM _total_sales
      AND p.lifetime_withdrawals IS NOT DISTINCT FROM _lifetime_withdrawals
      AND p.status IS NOT DISTINCT FROM _status
      AND p.is_active IS NOT DISTINCT FROM _is_active
      AND p.is_deleted IS NOT DISTINCT FROM _is_deleted
      AND p.login_id IS NOT DISTINCT FROM _login_id
      AND p.display_code IS NOT DISTINCT FROM _display_code
      AND p.team_id IS NOT DISTINCT FROM _team_id
      AND p.mobile_number IS NOT DISTINCT FROM _mobile_number
      AND p.email IS NOT DISTINCT FROM _email
      AND p.metrics_override IS NOT DISTINCT FROM _metrics_override
      AND p.referral_count IS NOT DISTINCT FROM _referral_count
  )
$$;

REVOKE ALL ON FUNCTION public.profiles_protected_unchanged(uuid, numeric, numeric, numeric, numeric, numeric, numeric, public.account_status, boolean, boolean, text, text, uuid, text, text, jsonb, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.profiles_protected_unchanged(uuid, numeric, numeric, numeric, numeric, numeric, numeric, public.account_status, boolean, boolean, text, text, uuid, text, text, jsonb, integer) TO authenticated, service_role;

-- 2) Column-scoped self-update policy
DROP POLICY IF EXISTS "profiles: user updates safe fields on own row" ON public.profiles;

CREATE POLICY "profiles: user updates safe fields on own row"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND (
    public.has_role(auth.uid(), 'super_admin')
    OR public.profiles_protected_unchanged(
      id, wallet_balance, pending_balance, locked_balance, total_earnings,
      total_sales, lifetime_withdrawals, status, is_active, is_deleted,
      login_id, display_code, team_id, mobile_number, email,
      metrics_override, referral_count
    )
  )
);

-- 3) Defense in depth: trigger now rejects instead of silently reverting
CREATE OR REPLACE FUNCTION public.profiles_guard_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Admins and privileged server routines (service_role / SECURITY DEFINER
  -- money functions running without a JWT) may change anything.
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'super_admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.wallet_balance       IS DISTINCT FROM OLD.wallet_balance
  OR NEW.pending_balance      IS DISTINCT FROM OLD.pending_balance
  OR NEW.locked_balance       IS DISTINCT FROM OLD.locked_balance
  OR NEW.total_earnings       IS DISTINCT FROM OLD.total_earnings
  OR NEW.total_sales          IS DISTINCT FROM OLD.total_sales
  OR NEW.lifetime_withdrawals IS DISTINCT FROM OLD.lifetime_withdrawals
  OR NEW.last_settlement_at   IS DISTINCT FROM OLD.last_settlement_at
  OR NEW.status               IS DISTINCT FROM OLD.status
  OR NEW.is_active            IS DISTINCT FROM OLD.is_active
  OR NEW.is_deleted           IS DISTINCT FROM OLD.is_deleted
  OR NEW.login_id             IS DISTINCT FROM OLD.login_id
  OR NEW.display_code         IS DISTINCT FROM OLD.display_code
  OR NEW.team_id              IS DISTINCT FROM OLD.team_id
  OR NEW.mobile_number        IS DISTINCT FROM OLD.mobile_number
  OR NEW.email                IS DISTINCT FROM OLD.email
  OR NEW.metrics_override     IS DISTINCT FROM OLD.metrics_override
  OR NEW.referral_count       IS DISTINCT FROM OLD.referral_count
  OR NEW.created_by           IS DISTINCT FROM OLD.created_by
  THEN
    RAISE EXCEPTION 'Not permitted: protected profile fields can only be changed by an administrator';
  END IF;

  RETURN NEW;
END $function$;
