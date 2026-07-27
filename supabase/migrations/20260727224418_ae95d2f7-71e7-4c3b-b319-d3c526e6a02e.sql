-- The guard ran as SECURITY DEFINER, which made current_user always resolve to
-- the function owner, so the "trusted internal routine" branch matched every
-- request (including direct client updates). SECURITY INVOKER keeps the real
-- caller role: 'authenticated' for direct API updates, the owner role when the
-- update happens inside a SECURITY DEFINER wallet/commission routine.
CREATE OR REPLACE FUNCTION public.profiles_guard_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL
     OR current_user NOT IN ('authenticated', 'anon')
     OR public.has_role(auth.uid(), 'super_admin') THEN
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

DROP FUNCTION IF EXISTS public.debug_whoami();