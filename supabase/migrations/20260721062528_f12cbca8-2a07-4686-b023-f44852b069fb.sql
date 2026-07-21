
-- 1) Extend profiles with wallet balance buckets
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pending_balance numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_balance numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lifetime_withdrawals numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_settlement_at timestamptz;

-- 2) Extend withdrawals table
ALTER TABLE public.withdrawals
  ADD COLUMN IF NOT EXISTS reference_number text,
  ADD COLUMN IF NOT EXISTS bank_holder text,
  ADD COLUMN IF NOT EXISTS bank_account_number text,
  ADD COLUMN IF NOT EXISTS bank_ifsc text,
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS bank_branch text,
  ADD COLUMN IF NOT EXISTS upi_id text,
  ADD COLUMN IF NOT EXISTS remarks text,
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE SEQUENCE IF NOT EXISTS public.withdrawal_ref_seq START 1;
CREATE UNIQUE INDEX IF NOT EXISTS withdrawals_reference_number_key ON public.withdrawals(reference_number);

-- Trigger to set updated_at and reference_number
CREATE OR REPLACE FUNCTION public.withdrawals_before_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.reference_number IS NULL THEN
    NEW.reference_number := 'AWD-' || LPAD(nextval('public.withdrawal_ref_seq')::text, 6, '0');
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_withdrawals_before_write ON public.withdrawals;
CREATE TRIGGER trg_withdrawals_before_write
  BEFORE INSERT OR UPDATE ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.withdrawals_before_write();

-- 3) Add withdrawal_id column on ledger for traceability
ALTER TABLE public.commission_ledger
  ADD COLUMN IF NOT EXISTS withdrawal_id uuid REFERENCES public.withdrawals(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS ledger_withdrawal_idx ON public.commission_ledger(withdrawal_id);

-- 4) Withdrawal window helper
CREATE OR REPLACE FUNCTION public.wallet_is_within_withdrawal_window()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXTRACT(day FROM now())::int BETWEEN 25 AND 30
$$;

-- 5) Request withdrawal (atomic: available -> locked, ledger debit, notify)
CREATE OR REPLACE FUNCTION public.wallet_request_withdrawal(
  p_amount numeric,
  p_bank_holder text,
  p_bank_account_number text,
  p_bank_ifsc text,
  p_bank_name text,
  p_bank_branch text DEFAULT NULL,
  p_upi_id text DEFAULT NULL,
  p_remarks text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_team uuid;
  v_bal numeric(14,2);
  v_locked numeric(14,2);
  v_pending_count int;
  v_id uuid;
  v_running numeric(14,2);
  v_ref text;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;
  IF NOT public.wallet_is_within_withdrawal_window() THEN
    RAISE EXCEPTION 'Withdrawal window is closed. Available 25th–30th of every month.';
  END IF;
  IF COALESCE(TRIM(p_bank_holder),'') = '' OR COALESCE(TRIM(p_bank_account_number),'') = ''
     OR COALESCE(TRIM(p_bank_ifsc),'') = '' OR COALESCE(TRIM(p_bank_name),'') = '' THEN
    RAISE EXCEPTION 'Bank details are required';
  END IF;

  SELECT team_id, COALESCE(wallet_balance,0), COALESCE(locked_balance,0)
    INTO v_team, v_bal, v_locked
    FROM public.profiles WHERE id = v_user FOR UPDATE;

  IF v_bal < p_amount THEN
    RAISE EXCEPTION 'Insufficient available balance (₹% available)', v_bal;
  END IF;

  SELECT COUNT(*) INTO v_pending_count FROM public.withdrawals
    WHERE user_id = v_user AND status IN ('pending','approved','processing');
  IF v_pending_count > 0 THEN
    RAISE EXCEPTION 'You already have an active withdrawal request.';
  END IF;

  INSERT INTO public.withdrawals (
    user_id, team_id, amount, status,
    bank_holder, bank_account_number, bank_ifsc, bank_name, bank_branch, upi_id, remarks
  ) VALUES (
    v_user, v_team, p_amount, 'pending',
    p_bank_holder, p_bank_account_number, UPPER(p_bank_ifsc), p_bank_name, p_bank_branch, p_upi_id, p_remarks
  ) RETURNING id, reference_number INTO v_id, v_ref;

  UPDATE public.profiles
     SET wallet_balance = wallet_balance - p_amount,
         locked_balance = COALESCE(locked_balance,0) + p_amount,
         updated_at = now()
   WHERE id = v_user;

  SELECT COALESCE(wallet_balance,0) INTO v_running FROM public.profiles WHERE id = v_user;

  INSERT INTO public.commission_ledger (
    ref_number, withdrawal_id, user_id, source, debit, running_balance, remarks
  ) VALUES (
    'LDG-' || LPAD(nextval('public.commission_ledger_seq')::text, 8, '0'),
    v_id, v_user, 'withdrawal_request', p_amount, v_running,
    'Withdrawal request ' || v_ref
  );

  INSERT INTO public.notifications (user_id, kind, title, body, metadata)
  VALUES (v_user, 'withdrawal_requested', 'Withdrawal requested',
    'Your withdrawal ' || v_ref || ' of ₹' || p_amount || ' is pending approval.',
    jsonb_build_object('withdrawal_id', v_id));

  -- Notify admins
  INSERT INTO public.notifications (user_id, kind, title, body, metadata)
  SELECT ur.user_id, 'withdrawal_requested', 'Withdrawal pending review',
         'Withdrawal ' || v_ref || ' from user needs review.',
         jsonb_build_object('withdrawal_id', v_id)
    FROM public.user_roles ur WHERE ur.role = 'super_admin';

  RETURN v_id;
END $$;

-- 6) Approve
CREATE OR REPLACE FUNCTION public.wallet_approve_withdrawal(p_id uuid, p_notes text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor uuid := auth.uid(); v_w record;
BEGIN
  IF NOT public.has_role(v_actor,'super_admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  SELECT * INTO v_w FROM public.withdrawals WHERE id = p_id FOR UPDATE;
  IF v_w IS NULL THEN RAISE EXCEPTION 'Withdrawal not found'; END IF;
  IF v_w.status <> 'pending' THEN RAISE EXCEPTION 'Only pending requests can be approved'; END IF;

  UPDATE public.withdrawals SET status='approved', approved_by=v_actor, approved_at=now(),
    admin_notes = COALESCE(admin_notes,'') || CASE WHEN p_notes IS NULL THEN '' ELSE E'\n[approve] '||p_notes END
    WHERE id = p_id;

  INSERT INTO public.notifications (user_id, kind, title, body, metadata)
  VALUES (v_w.user_id,'withdrawal_approved','Withdrawal approved',
    'Your withdrawal ' || v_w.reference_number || ' has been approved.',
    jsonb_build_object('withdrawal_id', p_id));
END $$;

-- 7) Mark processing
CREATE OR REPLACE FUNCTION public.wallet_mark_processing(p_id uuid, p_notes text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor uuid := auth.uid(); v_w record;
BEGIN
  IF NOT public.has_role(v_actor,'super_admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  SELECT * INTO v_w FROM public.withdrawals WHERE id = p_id FOR UPDATE;
  IF v_w IS NULL THEN RAISE EXCEPTION 'Withdrawal not found'; END IF;
  IF v_w.status <> 'approved' THEN RAISE EXCEPTION 'Only approved requests can be moved to processing'; END IF;
  UPDATE public.withdrawals SET status='processing', processed_at=now(),
    admin_notes = COALESCE(admin_notes,'') || CASE WHEN p_notes IS NULL THEN '' ELSE E'\n[processing] '||p_notes END
    WHERE id = p_id;
END $$;

-- 8) Complete
CREATE OR REPLACE FUNCTION public.wallet_complete_withdrawal(p_id uuid, p_notes text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor uuid := auth.uid(); v_w record; v_running numeric(14,2);
BEGIN
  IF NOT public.has_role(v_actor,'super_admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  SELECT * INTO v_w FROM public.withdrawals WHERE id = p_id FOR UPDATE;
  IF v_w IS NULL THEN RAISE EXCEPTION 'Withdrawal not found'; END IF;
  IF v_w.status NOT IN ('approved','processing') THEN RAISE EXCEPTION 'Cannot complete from status %', v_w.status; END IF;

  UPDATE public.profiles
     SET locked_balance = GREATEST(COALESCE(locked_balance,0) - v_w.amount, 0),
         lifetime_withdrawals = COALESCE(lifetime_withdrawals,0) + v_w.amount,
         last_settlement_at = now(),
         updated_at = now()
   WHERE id = v_w.user_id;

  UPDATE public.withdrawals SET status='completed', completed_at=now(),
    admin_notes = COALESCE(admin_notes,'') || CASE WHEN p_notes IS NULL THEN '' ELSE E'\n[completed] '||p_notes END
    WHERE id = p_id;

  SELECT COALESCE(wallet_balance,0) INTO v_running FROM public.profiles WHERE id = v_w.user_id;

  INSERT INTO public.commission_ledger (ref_number, withdrawal_id, user_id, source, debit, running_balance, remarks)
  VALUES ('LDG-' || LPAD(nextval('public.commission_ledger_seq')::text, 8, '0'),
          p_id, v_w.user_id, 'withdrawal_completed', 0, v_running,
          'Withdrawal ' || v_w.reference_number || ' completed');

  INSERT INTO public.notifications (user_id, kind, title, body, metadata)
  VALUES (v_w.user_id,'withdrawal_completed','Withdrawal completed',
    'Your withdrawal ' || v_w.reference_number || ' of ₹' || v_w.amount || ' has been transferred.',
    jsonb_build_object('withdrawal_id', p_id));
END $$;

-- 9) Reject / cancel (both release locked back to available)
CREATE OR REPLACE FUNCTION public.wallet_reject_withdrawal(p_id uuid, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor uuid := auth.uid(); v_w record; v_running numeric(14,2);
BEGIN
  IF NOT public.has_role(v_actor,'super_admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  SELECT * INTO v_w FROM public.withdrawals WHERE id = p_id FOR UPDATE;
  IF v_w IS NULL THEN RAISE EXCEPTION 'Withdrawal not found'; END IF;
  IF v_w.status IN ('completed','rejected','cancelled') THEN
    RAISE EXCEPTION 'Cannot reject from status %', v_w.status;
  END IF;

  UPDATE public.profiles
     SET wallet_balance = wallet_balance + v_w.amount,
         locked_balance = GREATEST(COALESCE(locked_balance,0) - v_w.amount, 0),
         updated_at = now()
   WHERE id = v_w.user_id;

  UPDATE public.withdrawals SET status='rejected', rejection_reason=p_reason, completed_at=now()
    WHERE id = p_id;

  SELECT COALESCE(wallet_balance,0) INTO v_running FROM public.profiles WHERE id = v_w.user_id;

  INSERT INTO public.commission_ledger (ref_number, withdrawal_id, user_id, source, credit, running_balance, remarks)
  VALUES ('LDG-' || LPAD(nextval('public.commission_ledger_seq')::text, 8, '0'),
          p_id, v_w.user_id, 'withdrawal_rejected', v_w.amount, v_running,
          'Withdrawal ' || v_w.reference_number || ' rejected: ' || COALESCE(p_reason,''));

  INSERT INTO public.notifications (user_id, kind, title, body, metadata)
  VALUES (v_w.user_id,'withdrawal_rejected','Withdrawal rejected',
    'Your withdrawal ' || v_w.reference_number || ' was rejected: ' || COALESCE(p_reason,''),
    jsonb_build_object('withdrawal_id', p_id));
END $$;

CREATE OR REPLACE FUNCTION public.wallet_cancel_withdrawal(p_id uuid, p_reason text DEFAULT 'Cancelled by user')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor uuid := auth.uid(); v_w record; v_running numeric(14,2);
BEGIN
  SELECT * INTO v_w FROM public.withdrawals WHERE id = p_id FOR UPDATE;
  IF v_w IS NULL THEN RAISE EXCEPTION 'Withdrawal not found'; END IF;
  IF v_w.user_id <> v_actor AND NOT public.has_role(v_actor,'super_admin') THEN
    RAISE EXCEPTION 'Not permitted';
  END IF;
  IF v_w.status NOT IN ('pending','approved') THEN
    RAISE EXCEPTION 'Only pending or approved requests can be cancelled';
  END IF;

  UPDATE public.profiles
     SET wallet_balance = wallet_balance + v_w.amount,
         locked_balance = GREATEST(COALESCE(locked_balance,0) - v_w.amount, 0),
         updated_at = now()
   WHERE id = v_w.user_id;

  UPDATE public.withdrawals SET status='cancelled', rejection_reason=p_reason, completed_at=now()
    WHERE id = p_id;

  SELECT COALESCE(wallet_balance,0) INTO v_running FROM public.profiles WHERE id = v_w.user_id;

  INSERT INTO public.commission_ledger (ref_number, withdrawal_id, user_id, source, credit, running_balance, remarks)
  VALUES ('LDG-' || LPAD(nextval('public.commission_ledger_seq')::text, 8, '0'),
          p_id, v_w.user_id, 'withdrawal_cancelled', v_w.amount, v_running,
          'Withdrawal ' || v_w.reference_number || ' cancelled: ' || COALESCE(p_reason,''));

  INSERT INTO public.notifications (user_id, kind, title, body, metadata)
  VALUES (v_w.user_id,'withdrawal_cancelled','Withdrawal cancelled',
    'Withdrawal ' || v_w.reference_number || ' cancelled.',
    jsonb_build_object('withdrawal_id', p_id));
END $$;

GRANT EXECUTE ON FUNCTION public.wallet_request_withdrawal(numeric,text,text,text,text,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_approve_withdrawal(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_mark_processing(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_complete_withdrawal(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_reject_withdrawal(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_cancel_withdrawal(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_is_within_withdrawal_window() TO authenticated;
