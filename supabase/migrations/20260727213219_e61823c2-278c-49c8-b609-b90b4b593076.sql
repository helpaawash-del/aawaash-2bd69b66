CREATE OR REPLACE FUNCTION public.profiles_guard_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF public.has_role(auth.uid(), 'super_admin') THEN
    RETURN NEW;
  END IF;
  NEW.wallet_balance        := OLD.wallet_balance;
  NEW.pending_balance       := OLD.pending_balance;
  NEW.locked_balance        := OLD.locked_balance;
  NEW.total_earnings        := OLD.total_earnings;
  NEW.total_sales           := OLD.total_sales;
  NEW.lifetime_withdrawals  := OLD.lifetime_withdrawals;
  NEW.last_settlement_at    := OLD.last_settlement_at;
  NEW.status                := OLD.status;
  NEW.is_active             := OLD.is_active;
  NEW.is_deleted            := OLD.is_deleted;
  NEW.login_id              := OLD.login_id;
  NEW.display_code          := OLD.display_code;
  NEW.team_id               := OLD.team_id;
  NEW.mobile_number         := OLD.mobile_number;
  NEW.email                 := OLD.email;
  NEW.metrics_override      := OLD.metrics_override;
  NEW.referral_count        := OLD.referral_count;
  NEW.created_by            := OLD.created_by;
  RETURN NEW;
END $function$;

DROP POLICY IF EXISTS "sales_member_insert" ON public.sales;
CREATE POLICY "sales_member_insert" ON public.sales
FOR INSERT TO authenticated
WITH CHECK (
  ((seller_id = auth.uid()) OR (created_by = auth.uid()))
  AND sale_status = ANY (ARRAY['draft','flat_locked','negotiation','documents_submitted','booking_received','verification','pending_approval'])
  AND approval_status = ANY (ARRAY['pending','submitted'])
  AND status = ANY (ARRAY['draft','pending','confirmed'])
  AND approved_by IS NULL
  AND approval_at IS NULL
);

DROP POLICY IF EXISTS "customers leader update team" ON public.customers;
CREATE POLICY "customers leader update team" ON public.customers
FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'team_leader')
  AND team_id IS NOT NULL
  AND team_id = public.my_team_id()
)
WITH CHECK (
  public.has_role(auth.uid(), 'team_leader')
  AND team_id IS NOT NULL
  AND public.my_team_id() IS NOT NULL
  AND team_id = public.my_team_id()
);