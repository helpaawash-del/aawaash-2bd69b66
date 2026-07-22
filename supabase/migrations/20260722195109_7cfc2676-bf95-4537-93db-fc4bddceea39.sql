
-- 1) profiles: prevent users from updating financial/status/identity columns on their own row.
CREATE OR REPLACE FUNCTION public.profiles_guard_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Super admin bypass
  IF public.has_role(auth.uid(), 'super_admin') THEN
    RETURN NEW;
  END IF;
  -- Revert any change to protected columns for self-updates
  NEW.wallet_balance        := OLD.wallet_balance;
  NEW.pending_balance       := OLD.pending_balance;
  NEW.locked_balance        := OLD.locked_balance;
  NEW.total_earnings        := OLD.total_earnings;
  NEW.total_sales           := OLD.total_sales;
  NEW.lifetime_withdrawals  := OLD.lifetime_withdrawals;
  NEW.last_settlement_at    := OLD.last_settlement_at;
  NEW.status                := OLD.status;
  NEW.is_active             := OLD.is_active;
  NEW.login_id              := OLD.login_id;
  NEW.display_code          := OLD.display_code;
  NEW.team_id               := OLD.team_id;
  NEW.mobile_number         := OLD.mobile_number;
  NEW.email                 := OLD.email;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS profiles_guard_self_update_trg ON public.profiles;
CREATE TRIGGER profiles_guard_self_update_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.profiles_guard_self_update();

-- 2) sales: prevent sellers from tampering with financial or approval fields on their own drafts.
CREATE OR REPLACE FUNCTION public.sales_guard_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'super_admin') THEN
    RETURN NEW;
  END IF;
  -- Revert changes to financial and approval-sensitive columns
  NEW.deal_value          := OLD.deal_value;
  NEW.booking_amount      := OLD.booking_amount;
  NEW.remaining_amount    := OLD.remaining_amount;
  NEW.approval_status     := OLD.approval_status;
  NEW.approved_by         := OLD.approved_by;
  NEW.approval_at         := OLD.approval_at;
  NEW.sale_status         := OLD.sale_status;
  NEW.status              := OLD.status;
  NEW.seller_id           := OLD.seller_id;
  NEW.leader_id           := OLD.leader_id;
  NEW.team_id             := OLD.team_id;
  NEW.flat_id             := OLD.flat_id;
  NEW.project_id          := OLD.project_id;
  NEW.customer_id         := OLD.customer_id;
  NEW.sale_number         := OLD.sale_number;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS sales_guard_self_update_trg ON public.sales;
CREATE TRIGGER sales_guard_self_update_trg
BEFORE UPDATE ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.sales_guard_self_update();

-- 3) asset_audit_log: forbid forged actor values on inserts.
DROP POLICY IF EXISTS "auth insert audit" ON public.asset_audit_log;
CREATE POLICY "auth insert audit own actor"
  ON public.asset_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (actor IS NULL OR actor = auth.uid());

-- 4) assets: hide non-public asset metadata from ordinary authenticated users.
DROP POLICY IF EXISTS "auth read media" ON public.assets;
CREATE POLICY "auth read public or admin"
  ON public.assets
  FOR SELECT
  TO authenticated
  USING (is_public = true OR public.has_role(auth.uid(), 'super_admin'));
