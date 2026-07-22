
-- Admin wallet adjustment RPC — atomic balance change through the ledger
CREATE OR REPLACE FUNCTION public.wallet_admin_adjust(
  p_user_id uuid,
  p_amount numeric,
  p_direction text,        -- 'credit' | 'debit'
  p_kind text,             -- 'bonus' | 'correction' | 'refund' | 'penalty' | 'compensation' | 'adjustment'
  p_reason text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_is_admin boolean;
  v_bal numeric(14,2);
  v_new_bal numeric(14,2);
  v_credit numeric(14,2) := 0;
  v_debit numeric(14,2) := 0;
  v_ref text;
  v_id uuid;
BEGIN
  SELECT public.has_role(v_admin, 'super_admin') INTO v_is_admin;
  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;
  IF p_direction NOT IN ('credit','debit') THEN
    RAISE EXCEPTION 'Direction must be credit or debit';
  END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN
    RAISE EXCEPTION 'Reason required';
  END IF;

  SELECT COALESCE(wallet_balance,0) INTO v_bal FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF v_bal IS NULL THEN RAISE EXCEPTION 'User wallet not found'; END IF;

  IF p_direction = 'credit' THEN
    v_credit := p_amount;
    v_new_bal := v_bal + p_amount;
  ELSE
    IF v_bal < p_amount THEN
      RAISE EXCEPTION 'Insufficient balance for debit';
    END IF;
    v_debit := p_amount;
    v_new_bal := v_bal - p_amount;
  END IF;

  UPDATE public.profiles
  SET wallet_balance = v_new_bal,
      total_earnings = CASE WHEN p_direction='credit' AND p_kind IN ('bonus','compensation') THEN total_earnings + p_amount ELSE total_earnings END
  WHERE id = p_user_id;

  v_ref := 'ADJ-' || to_char(now(),'YYYYMMDD') || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,8);

  INSERT INTO public.commission_ledger(ref_number, user_id, source, credit, debit, running_balance, remarks, status)
  VALUES (v_ref, p_user_id, 'admin_' || p_kind, v_credit, v_debit, v_new_bal, p_reason, 'posted')
  RETURNING id INTO v_id;

  -- audit
  BEGIN
    INSERT INTO public.audit_logs(actor_id, entity_type, entity_id, action, details)
    VALUES (v_admin, 'wallet', p_user_id, 'adjust_' || p_direction,
            jsonb_build_object('amount', p_amount, 'kind', p_kind, 'reason', p_reason, 'ref', v_ref, 'new_balance', v_new_bal));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- notification
  BEGIN
    INSERT INTO public.notifications(user_id, kind, title, body)
    VALUES (p_user_id,
            'wallet_' || p_direction,
            CASE WHEN p_direction='credit' THEN 'Wallet credited' ELSE 'Wallet debited' END,
            format('₹%s %s — %s', p_amount::text, p_direction, p_reason));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.wallet_admin_adjust(uuid, numeric, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.wallet_admin_adjust(uuid, numeric, text, text, text) TO authenticated;
