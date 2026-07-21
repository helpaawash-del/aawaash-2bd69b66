
-- =========================================================================
-- PART 5.2 — Commission Engine
-- =========================================================================

-- 1) COMMISSION SLABS ------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.commission_slabs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  min_amount NUMERIC(16,2) NOT NULL,
  max_amount NUMERIC(16,2), -- NULL means open-ended upper bound
  percent NUMERIC(6,4) NOT NULL, -- e.g. 3.0000 for 3%
  bonus_enabled BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT commission_slabs_bounds CHECK (max_amount IS NULL OR max_amount > min_amount),
  CONSTRAINT commission_slabs_percent CHECK (percent >= 0 AND percent <= 100)
);
GRANT SELECT ON public.commission_slabs TO authenticated;
GRANT ALL ON public.commission_slabs TO service_role;
ALTER TABLE public.commission_slabs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "slabs read" ON public.commission_slabs;
CREATE POLICY "slabs read" ON public.commission_slabs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "slabs admin manages" ON public.commission_slabs;
CREATE POLICY "slabs admin manages" ON public.commission_slabs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER commission_slabs_updated_at
  BEFORE UPDATE ON public.commission_slabs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed default slabs (idempotent by label)
INSERT INTO public.commission_slabs (label, min_amount, max_amount, percent, bonus_enabled, sort_order)
VALUES
  ('0 – 1 Cr',        0,           10000000,   3.00,    false, 10),
  ('1 – 3 Cr',        10000000,    30000000,   4.00,    false, 20),
  ('3 – 5 Cr',        30000000,    50000000,   5.00,    false, 30),
  ('5 – 7 Cr',        50000000,    70000000,   5.75,    false, 40),
  ('7 – 10 Cr',       70000000,    100000000,  6.50,    false, 50),
  ('Above 10 Cr',     100000000,   NULL,       7.00,    true,  60)
ON CONFLICT DO NOTHING;

-- 2) COMMISSION SETTINGS (member/tip percentages, configurable) -----------
CREATE TABLE IF NOT EXISTS public.commission_settings (
  id INT PRIMARY KEY DEFAULT 1,
  member_share_pct NUMERIC(6,4) NOT NULL DEFAULT 30.00,  -- 30% of leader
  tip_share_pct NUMERIC(6,4) NOT NULL DEFAULT 0.50,      -- 0.5% of member
  bonus_threshold NUMERIC(16,2) NOT NULL DEFAULT 100000000, -- ₹10 Cr
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT commission_settings_singleton CHECK (id = 1)
);
GRANT SELECT ON public.commission_settings TO authenticated;
GRANT ALL ON public.commission_settings TO service_role;
ALTER TABLE public.commission_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "settings read" ON public.commission_settings;
CREATE POLICY "settings read" ON public.commission_settings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "settings admin manages" ON public.commission_settings;
CREATE POLICY "settings admin manages" ON public.commission_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
INSERT INTO public.commission_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- 3) COMMISSION TRANSACTIONS (header per sale) ----------------------------
CREATE SEQUENCE IF NOT EXISTS public.commission_txn_seq START 1;

CREATE TABLE IF NOT EXISTS public.commission_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  txn_number TEXT NOT NULL UNIQUE,
  sale_id UUID NOT NULL UNIQUE REFERENCES public.sales(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  flat_id UUID REFERENCES public.flats(id) ON DELETE SET NULL,
  leader_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  member_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  tip_person_id UUID REFERENCES public.tip_persons(id) ON DELETE SET NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  slab_id UUID REFERENCES public.commission_slabs(id) ON DELETE SET NULL,
  slab_pct NUMERIC(6,4) NOT NULL,
  sale_amount NUMERIC(16,2) NOT NULL,
  leader_gross NUMERIC(16,2) NOT NULL DEFAULT 0,
  member_amount NUMERIC(16,2) NOT NULL DEFAULT 0,
  tip_amount NUMERIC(16,2) NOT NULL DEFAULT 0,
  bonus_amount NUMERIC(16,2) NOT NULL DEFAULT 0,
  net_leader NUMERIC(16,2) NOT NULL DEFAULT 0,
  bonus_flag BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'generated',        -- generated|verified|settled|reversed|cancelled|expired
  approval_status TEXT NOT NULL DEFAULT 'approved',-- pending|approved|rejected
  wallet_status TEXT NOT NULL DEFAULT 'credited',  -- pending|credited|settled|reversed
  settlement_status TEXT NOT NULL DEFAULT 'unsettled',
  withdrawal_status TEXT NOT NULL DEFAULT 'eligible',
  reversed_at TIMESTAMPTZ,
  reversal_reason TEXT,
  generated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  extras JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS commission_txn_leader_idx ON public.commission_transactions(leader_id, created_at DESC);
CREATE INDEX IF NOT EXISTS commission_txn_member_idx ON public.commission_transactions(member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS commission_txn_team_idx   ON public.commission_transactions(team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS commission_txn_status_idx ON public.commission_transactions(status);

GRANT SELECT ON public.commission_transactions TO authenticated;
GRANT ALL ON public.commission_transactions TO service_role;
ALTER TABLE public.commission_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ctxn: recipient reads" ON public.commission_transactions;
CREATE POLICY "ctxn: recipient reads" ON public.commission_transactions
  FOR SELECT TO authenticated USING (
    leader_id = auth.uid()
    OR member_id = auth.uid()
    OR public.has_role(auth.uid(), 'super_admin')
    OR (public.has_role(auth.uid(), 'team_leader')
        AND team_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid()))
  );
DROP POLICY IF EXISTS "ctxn: admin manages" ON public.commission_transactions;
CREATE POLICY "ctxn: admin manages" ON public.commission_transactions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER commission_transactions_updated_at
  BEFORE UPDATE ON public.commission_transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) Extend existing commissions table for per-recipient rows -------------
ALTER TABLE public.commissions
  ADD COLUMN IF NOT EXISTS transaction_id UUID REFERENCES public.commission_transactions(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS recipient_kind TEXT,   -- leader|member|tip
  ADD COLUMN IF NOT EXISTS tip_person_id UUID REFERENCES public.tip_persons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS wallet_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS commissions_updated_at ON public.commissions;
CREATE TRIGGER commissions_updated_at
  BEFORE UPDATE ON public.commissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS commissions_txn_idx ON public.commissions(transaction_id);

-- 5) COMMISSION LEDGER (immutable) ----------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.commission_ledger_seq START 1;

CREATE TABLE IF NOT EXISTS public.commission_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_number TEXT NOT NULL UNIQUE,
  transaction_id UUID REFERENCES public.commission_transactions(id) ON DELETE SET NULL,
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  source TEXT NOT NULL,   -- leader_commission|member_commission|tip_commission|bonus|reversal|adjustment
  debit NUMERIC(16,2) NOT NULL DEFAULT 0,
  credit NUMERIC(16,2) NOT NULL DEFAULT 0,
  running_balance NUMERIC(16,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'posted',
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ledger_dr_or_cr CHECK ((debit = 0 AND credit >= 0) OR (credit = 0 AND debit >= 0))
);
CREATE INDEX IF NOT EXISTS ledger_user_idx ON public.commission_ledger(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ledger_txn_idx  ON public.commission_ledger(transaction_id);

GRANT SELECT ON public.commission_ledger TO authenticated;
GRANT ALL ON public.commission_ledger TO service_role;
ALTER TABLE public.commission_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ledger: owner reads" ON public.commission_ledger;
CREATE POLICY "ledger: owner reads" ON public.commission_ledger
  FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin')
    OR (public.has_role(auth.uid(), 'team_leader')
        AND user_id IN (SELECT id FROM public.profiles WHERE team_id =
          (SELECT team_id FROM public.profiles WHERE id = auth.uid())))
  );
-- Enforce true immutability: no UPDATE, no DELETE. Only admin insert-via-server.
DROP POLICY IF EXISTS "ledger: admin inserts" ON public.commission_ledger;
CREATE POLICY "ledger: admin inserts" ON public.commission_ledger
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- 6) COMMISSION AUDIT LOG --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.commission_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES public.commission_transactions(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  from_value JSONB,
  to_value JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS caudit_txn_idx ON public.commission_audit_log(transaction_id, created_at DESC);
GRANT SELECT ON public.commission_audit_log TO authenticated;
GRANT ALL ON public.commission_audit_log TO service_role;
ALTER TABLE public.commission_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "caudit: admin reads" ON public.commission_audit_log;
CREATE POLICY "caudit: admin reads" ON public.commission_audit_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- 7) ENGINE: pick_commission_slab -----------------------------------------
CREATE OR REPLACE FUNCTION public.pick_commission_slab(p_amount NUMERIC)
RETURNS public.commission_slabs
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM public.commission_slabs
  WHERE active = true
    AND p_amount >= min_amount
    AND (max_amount IS NULL OR p_amount < max_amount)
  ORDER BY sort_order DESC, min_amount DESC
  LIMIT 1
$$;

-- 8) ENGINE: generate_commissions_for_sale (idempotent) -------------------
CREATE OR REPLACE FUNCTION public.generate_commissions_for_sale(p_sale_id UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_sale RECORD;
  v_flat RECORD;
  v_slab public.commission_slabs;
  v_settings public.commission_settings;
  v_txn_id UUID;
  v_txn_number TEXT;
  v_leader_gross NUMERIC(16,2);
  v_member_amt NUMERIC(16,2);
  v_tip_amt NUMERIC(16,2) := 0;
  v_bonus_amt NUMERIC(16,2) := 0;
  v_net_leader NUMERIC(16,2);
  v_tip_id UUID;
  v_running NUMERIC(16,2);
BEGIN
  -- Idempotency: return existing if already generated
  SELECT id INTO v_txn_id FROM public.commission_transactions WHERE sale_id = p_sale_id;
  IF v_txn_id IS NOT NULL THEN
    RETURN v_txn_id;
  END IF;

  SELECT * INTO v_sale FROM public.sales WHERE id = p_sale_id FOR UPDATE;
  IF v_sale IS NULL THEN RAISE EXCEPTION 'Sale not found'; END IF;
  IF v_sale.approval_status <> 'approved' OR v_sale.sale_status <> 'approved' THEN
    RAISE EXCEPTION 'Commissions require an approved sale';
  END IF;
  IF v_sale.flat_id IS NULL THEN RAISE EXCEPTION 'Sale has no flat'; END IF;
  SELECT * INTO v_flat FROM public.flats WHERE id = v_sale.flat_id;
  IF v_flat.status <> 'sold' THEN RAISE EXCEPTION 'Flat not marked sold'; END IF;
  IF v_sale.seller_id IS NULL THEN RAISE EXCEPTION 'Sale has no seller'; END IF;

  SELECT * INTO v_settings FROM public.commission_settings WHERE id = 1;
  SELECT * INTO v_slab FROM public.pick_commission_slab(v_sale.deal_value);
  IF v_slab IS NULL THEN RAISE EXCEPTION 'No commission slab covers amount %', v_sale.deal_value; END IF;

  v_leader_gross := ROUND(v_sale.deal_value * v_slab.percent / 100.0, 2);
  v_member_amt   := ROUND(v_leader_gross * v_settings.member_share_pct / 100.0, 2);

  -- Tip person: use most recent tip_person for this member+customer if present
  SELECT id INTO v_tip_id FROM public.tip_persons
   WHERE member_id = v_sale.seller_id
     AND (customer_name = v_sale.buyer_name OR customer_contact = v_sale.buyer_mobile)
   ORDER BY created_at DESC LIMIT 1;
  IF v_tip_id IS NOT NULL THEN
    v_tip_amt := ROUND(v_member_amt * v_settings.tip_share_pct / 100.0, 2);
  END IF;

  IF v_slab.bonus_enabled AND v_sale.deal_value >= v_settings.bonus_threshold THEN
    -- Placeholder: flat bonus = 0 by default; admin can adjust later via manual bonus.
    v_bonus_amt := 0;
  END IF;

  v_net_leader := v_leader_gross - v_member_amt - v_tip_amt + v_bonus_amt;

  v_txn_number := 'ACM-' || LPAD(nextval('public.commission_txn_seq')::text, 6, '0');

  INSERT INTO public.commission_transactions (
    txn_number, sale_id, customer_id, project_id, flat_id,
    leader_id, member_id, tip_person_id, team_id,
    slab_id, slab_pct, sale_amount,
    leader_gross, member_amount, tip_amount, bonus_amount, net_leader,
    bonus_flag, generated_by, approved_by
  ) VALUES (
    v_txn_number, p_sale_id, v_sale.customer_id, v_sale.project_id, v_sale.flat_id,
    v_sale.leader_id, v_sale.seller_id, v_tip_id, v_sale.team_id,
    v_slab.id, v_slab.percent, v_sale.deal_value,
    v_leader_gross, v_member_amt, v_tip_amt, v_bonus_amt, v_net_leader,
    v_slab.bonus_enabled AND v_sale.deal_value >= v_settings.bonus_threshold,
    COALESCE(v_sale.approved_by, auth.uid()), COALESCE(v_sale.approved_by, auth.uid())
  ) RETURNING id INTO v_txn_id;

  -- Per-recipient rows in commissions table + wallet credit + ledger entries
  -- Leader
  IF v_sale.leader_id IS NOT NULL THEN
    INSERT INTO public.commissions (sale_id, user_id, team_id, tier, amount, status, transaction_id, recipient_kind, wallet_status)
    VALUES (p_sale_id, v_sale.leader_id, v_sale.team_id, 2, v_net_leader, 'credited', v_txn_id, 'leader', 'credited');
    UPDATE public.profiles
       SET wallet_balance = COALESCE(wallet_balance,0) + v_net_leader,
           total_earnings = COALESCE(total_earnings,0) + v_net_leader
     WHERE id = v_sale.leader_id;
    SELECT COALESCE(wallet_balance,0) INTO v_running FROM public.profiles WHERE id = v_sale.leader_id;
    INSERT INTO public.commission_ledger (ref_number, transaction_id, sale_id, user_id, source, credit, running_balance, remarks)
    VALUES ('LDG-' || LPAD(nextval('public.commission_ledger_seq')::text, 8, '0'),
            v_txn_id, p_sale_id, v_sale.leader_id, 'leader_commission', v_net_leader, v_running,
            'Leader commission for ' || v_sale.sale_number);
  END IF;

  -- Member (seller)
  INSERT INTO public.commissions (sale_id, user_id, team_id, tier, amount, status, transaction_id, recipient_kind, wallet_status)
  VALUES (p_sale_id, v_sale.seller_id, v_sale.team_id, 1, v_member_amt, 'credited', v_txn_id, 'member', 'credited');
  UPDATE public.profiles
     SET wallet_balance = COALESCE(wallet_balance,0) + v_member_amt,
         total_earnings = COALESCE(total_earnings,0) + v_member_amt
   WHERE id = v_sale.seller_id;
  SELECT COALESCE(wallet_balance,0) INTO v_running FROM public.profiles WHERE id = v_sale.seller_id;
  INSERT INTO public.commission_ledger (ref_number, transaction_id, sale_id, user_id, source, credit, running_balance, remarks)
  VALUES ('LDG-' || LPAD(nextval('public.commission_ledger_seq')::text, 8, '0'),
          v_txn_id, p_sale_id, v_sale.seller_id, 'member_commission', v_member_amt, v_running,
          'Member commission for ' || v_sale.sale_number);

  -- Tip person (tracked, no wallet — future wallet integration ready)
  IF v_tip_id IS NOT NULL AND v_tip_amt > 0 THEN
    INSERT INTO public.commissions (sale_id, user_id, team_id, tier, amount, status, transaction_id, recipient_kind, wallet_status, tip_person_id)
    VALUES (p_sale_id, v_sale.seller_id, v_sale.team_id, 3, v_tip_amt, 'pending', v_txn_id, 'tip', 'pending', v_tip_id);
    UPDATE public.tip_persons SET status = 'rewarded' WHERE id = v_tip_id;
    INSERT INTO public.commission_ledger (ref_number, transaction_id, sale_id, user_id, source, credit, running_balance, remarks)
    VALUES ('LDG-' || LPAD(nextval('public.commission_ledger_seq')::text, 8, '0'),
            v_txn_id, p_sale_id, NULL, 'tip_commission', v_tip_amt, 0,
            'Tip commission for ' || v_sale.sale_number);
  END IF;

  -- Notifications
  IF v_sale.leader_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, kind, title, body, metadata)
    VALUES (v_sale.leader_id, 'commission_generated', 'Commission generated',
            'Net commission ' || v_net_leader || ' credited for sale ' || v_sale.sale_number,
            jsonb_build_object('transaction_id', v_txn_id, 'sale_id', p_sale_id));
  END IF;
  INSERT INTO public.notifications (user_id, kind, title, body, metadata)
  VALUES (v_sale.seller_id, 'commission_generated', 'Commission generated',
          'You earned ' || v_member_amt || ' from sale ' || v_sale.sale_number,
          jsonb_build_object('transaction_id', v_txn_id, 'sale_id', p_sale_id));

  -- Audit
  INSERT INTO public.commission_audit_log (transaction_id, sale_id, actor_id, action, to_value)
  VALUES (v_txn_id, p_sale_id, auth.uid(), 'commission_generated',
          jsonb_build_object('leader_gross', v_leader_gross, 'member', v_member_amt,
                             'tip', v_tip_amt, 'bonus', v_bonus_amt, 'net_leader', v_net_leader,
                             'slab_pct', v_slab.percent));

  RETURN v_txn_id;
END $$;

-- 9) ENGINE: reverse_commissions_for_sale ---------------------------------
CREATE OR REPLACE FUNCTION public.reverse_commissions_for_sale(p_sale_id UUID, p_reason TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_txn public.commission_transactions;
  v_running NUMERIC(16,2);
BEGIN
  SELECT * INTO v_txn FROM public.commission_transactions WHERE sale_id = p_sale_id FOR UPDATE;
  IF v_txn IS NULL THEN RETURN; END IF;
  IF v_txn.status = 'reversed' THEN RETURN; END IF;

  -- Debit wallets
  IF v_txn.leader_id IS NOT NULL AND v_txn.net_leader > 0 THEN
    UPDATE public.profiles
       SET wallet_balance = COALESCE(wallet_balance,0) - v_txn.net_leader,
           total_earnings = COALESCE(total_earnings,0) - v_txn.net_leader
     WHERE id = v_txn.leader_id;
    SELECT COALESCE(wallet_balance,0) INTO v_running FROM public.profiles WHERE id = v_txn.leader_id;
    INSERT INTO public.commission_ledger (ref_number, transaction_id, sale_id, user_id, source, debit, running_balance, remarks)
    VALUES ('LDG-' || LPAD(nextval('public.commission_ledger_seq')::text, 8, '0'),
            v_txn.id, p_sale_id, v_txn.leader_id, 'reversal', v_txn.net_leader, v_running,
            'Reversal: ' || COALESCE(p_reason,''));
  END IF;
  IF v_txn.member_id IS NOT NULL AND v_txn.member_amount > 0 THEN
    UPDATE public.profiles
       SET wallet_balance = COALESCE(wallet_balance,0) - v_txn.member_amount,
           total_earnings = COALESCE(total_earnings,0) - v_txn.member_amount
     WHERE id = v_txn.member_id;
    SELECT COALESCE(wallet_balance,0) INTO v_running FROM public.profiles WHERE id = v_txn.member_id;
    INSERT INTO public.commission_ledger (ref_number, transaction_id, sale_id, user_id, source, debit, running_balance, remarks)
    VALUES ('LDG-' || LPAD(nextval('public.commission_ledger_seq')::text, 8, '0'),
            v_txn.id, p_sale_id, v_txn.member_id, 'reversal', v_txn.member_amount, v_running,
            'Reversal: ' || COALESCE(p_reason,''));
  END IF;

  UPDATE public.commissions SET status = 'cancelled', wallet_status = 'reversed' WHERE transaction_id = v_txn.id;
  UPDATE public.commission_transactions
     SET status = 'reversed', wallet_status = 'reversed', reversed_at = now(), reversal_reason = p_reason
   WHERE id = v_txn.id;

  INSERT INTO public.commission_audit_log (transaction_id, sale_id, actor_id, action, reason, to_value)
  VALUES (v_txn.id, p_sale_id, auth.uid(), 'commission_reversed', p_reason, jsonb_build_object('net_leader', v_txn.net_leader, 'member', v_txn.member_amount));

  -- Notifications
  IF v_txn.leader_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, kind, title, body, metadata)
    VALUES (v_txn.leader_id, 'commission_reversed', 'Commission reversed',
            'Commission ' || v_txn.txn_number || ' reversed: ' || COALESCE(p_reason,''),
            jsonb_build_object('transaction_id', v_txn.id));
  END IF;
  IF v_txn.member_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, kind, title, body, metadata)
    VALUES (v_txn.member_id, 'commission_reversed', 'Commission reversed',
            'Commission ' || v_txn.txn_number || ' reversed: ' || COALESCE(p_reason,''),
            jsonb_build_object('transaction_id', v_txn.id));
  END IF;
END $$;

-- 10) Rewire approve_sale to use the engine (single source of truth) ------
CREATE OR REPLACE FUNCTION public.approve_sale(p_sale_id uuid, p_notes text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_user UUID := auth.uid();
  v_sale RECORD;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT has_role(v_user, 'super_admin') THEN
    RAISE EXCEPTION 'Only Super Admin may approve sales';
  END IF;

  SELECT * INTO v_sale FROM public.sales WHERE id = p_sale_id FOR UPDATE;
  IF v_sale IS NULL THEN RAISE EXCEPTION 'Sale not found'; END IF;
  IF v_sale.approval_status = 'approved' THEN RAISE EXCEPTION 'Sale already approved'; END IF;
  IF v_sale.sale_status IN ('cancelled','rejected','expired','refunded') THEN
    RAISE EXCEPTION 'Sale cannot be approved (status: %)', v_sale.sale_status;
  END IF;
  IF v_sale.flat_id IS NULL THEN RAISE EXCEPTION 'Sale has no flat attached'; END IF;

  UPDATE public.sales
     SET sale_status = 'approved', approval_status = 'approved', status = 'confirmed',
         approved_by = v_user, approval_at = now(),
         notes = COALESCE(notes,'') || CASE WHEN p_notes IS NULL THEN '' ELSE E'\n[approval] ' || p_notes END
   WHERE id = p_sale_id;

  UPDATE public.flats SET status = 'sold', booking_status = 'closed' WHERE id = v_sale.flat_id;
  UPDATE public.flat_locks SET released = true WHERE flat_id = v_sale.flat_id AND released = false;

  IF v_sale.customer_id IS NOT NULL THEN
    UPDATE public.customers SET status = 'sale_completed', updated_at = now() WHERE id = v_sale.customer_id;
    INSERT INTO public.customer_timeline (customer_id, actor_id, event_type, title, description, metadata)
    VALUES (v_sale.customer_id, v_user, 'sale_approved', 'Sale approved',
            'Sale ' || v_sale.sale_number || ' approved',
            jsonb_build_object('sale_id', p_sale_id));
  END IF;

  -- Central commission engine
  PERFORM public.generate_commissions_for_sale(p_sale_id);

  INSERT INTO public.sale_audit_log (sale_id, actor_id, actor_role, action, to_value, reason)
  VALUES (p_sale_id, v_user, 'super_admin', 'sale_approved',
          jsonb_build_object('approved_at', now()), p_notes);
END $function$;

-- 11) Rewire cancel_sale + reject_sale to reverse commissions --------------
CREATE OR REPLACE FUNCTION public.cancel_sale(p_sale_id uuid, p_reason text)
 RETURNS void
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_user UUID := auth.uid();
  v_sale RECORD;
  v_role app_role;
BEGIN
  SELECT public.current_user_role() INTO v_role;
  SELECT * INTO v_sale FROM public.sales WHERE id = p_sale_id FOR UPDATE;
  IF v_sale IS NULL THEN RAISE EXCEPTION 'Sale not found'; END IF;

  IF v_role = 'super_admin' THEN
    NULL;
  ELSIF (v_sale.seller_id = v_user OR v_sale.created_by = v_user)
     AND v_sale.approval_status IN ('pending','submitted','changes_requested') THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'Not permitted to cancel this sale';
  END IF;

  -- Reverse commissions FIRST if already generated
  PERFORM public.reverse_commissions_for_sale(p_sale_id, p_reason);

  UPDATE public.sales
     SET sale_status = 'cancelled', approval_status = 'cancelled',
         status = 'cancelled', cancellation_reason = p_reason
   WHERE id = p_sale_id;

  IF v_sale.flat_id IS NOT NULL THEN
    UPDATE public.flats SET status = 'available', booking_status = 'open' WHERE id = v_sale.flat_id;
    UPDATE public.flat_locks SET released = true WHERE flat_id = v_sale.flat_id AND released = false;
  END IF;

  IF v_sale.customer_id IS NOT NULL THEN
    INSERT INTO public.customer_timeline (customer_id, actor_id, event_type, title, description, metadata)
    VALUES (v_sale.customer_id, v_user, 'sale_cancelled', 'Sale cancelled',
            'Sale ' || v_sale.sale_number || ' cancelled: ' || COALESCE(p_reason,''),
            jsonb_build_object('sale_id', p_sale_id));
  END IF;

  INSERT INTO public.sale_audit_log (sale_id, actor_id, actor_role, action, reason)
  VALUES (p_sale_id, v_user, COALESCE(v_role::text,'member'), 'sale_cancelled', p_reason);
END $function$;

CREATE OR REPLACE FUNCTION public.reject_sale(p_sale_id uuid, p_reason text)
 RETURNS void
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_user UUID := auth.uid();
  v_sale RECORD;
BEGIN
  IF NOT has_role(v_user, 'super_admin') THEN
    RAISE EXCEPTION 'Only Super Admin may reject sales';
  END IF;
  SELECT * INTO v_sale FROM public.sales WHERE id = p_sale_id FOR UPDATE;
  IF v_sale IS NULL THEN RAISE EXCEPTION 'Sale not found'; END IF;
  IF v_sale.approval_status = 'approved' THEN RAISE EXCEPTION 'Cannot reject an approved sale'; END IF;

  PERFORM public.reverse_commissions_for_sale(p_sale_id, p_reason);

  UPDATE public.sales
     SET sale_status = 'rejected', approval_status = 'rejected',
         status = 'cancelled', cancellation_reason = p_reason
   WHERE id = p_sale_id;

  IF v_sale.flat_id IS NOT NULL THEN
    UPDATE public.flats SET status = 'available', booking_status = 'open' WHERE id = v_sale.flat_id;
    UPDATE public.flat_locks SET released = true WHERE flat_id = v_sale.flat_id AND released = false;
  END IF;

  INSERT INTO public.notifications (user_id, kind, title, body, metadata)
  SELECT DISTINCT uid, 'sale_rejected', 'Sale rejected',
         'Sale ' || v_sale.sale_number || ' was rejected: ' || COALESCE(p_reason,''),
         jsonb_build_object('sale_id', p_sale_id)
  FROM unnest(ARRAY[v_sale.seller_id, v_sale.leader_id]) AS uid
  WHERE uid IS NOT NULL;

  INSERT INTO public.sale_audit_log (sale_id, actor_id, actor_role, action, reason)
  VALUES (p_sale_id, v_user, 'super_admin', 'sale_rejected', p_reason);
END $function$;

-- 12) Convenience RPC: manual admin bonus (extends engine) ----------------
CREATE OR REPLACE FUNCTION public.grant_manual_bonus(p_txn_id UUID, p_amount NUMERIC, p_reason TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_txn public.commission_transactions;
  v_running NUMERIC(16,2);
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Bonus amount must be positive'; END IF;
  SELECT * INTO v_txn FROM public.commission_transactions WHERE id = p_txn_id FOR UPDATE;
  IF v_txn IS NULL THEN RAISE EXCEPTION 'Transaction not found'; END IF;
  IF v_txn.status = 'reversed' THEN RAISE EXCEPTION 'Cannot bonus a reversed txn'; END IF;

  UPDATE public.commission_transactions
     SET bonus_amount = bonus_amount + p_amount,
         net_leader = net_leader + p_amount
   WHERE id = p_txn_id;

  IF v_txn.leader_id IS NOT NULL THEN
    UPDATE public.profiles
       SET wallet_balance = COALESCE(wallet_balance,0) + p_amount,
           total_earnings = COALESCE(total_earnings,0) + p_amount
     WHERE id = v_txn.leader_id;
    SELECT COALESCE(wallet_balance,0) INTO v_running FROM public.profiles WHERE id = v_txn.leader_id;
    INSERT INTO public.commission_ledger (ref_number, transaction_id, sale_id, user_id, source, credit, running_balance, remarks)
    VALUES ('LDG-' || LPAD(nextval('public.commission_ledger_seq')::text, 8, '0'),
            p_txn_id, v_txn.sale_id, v_txn.leader_id, 'bonus', p_amount, v_running, 'Manual bonus: ' || COALESCE(p_reason,''));
  END IF;

  INSERT INTO public.commission_audit_log (transaction_id, sale_id, actor_id, action, reason, to_value)
  VALUES (p_txn_id, v_txn.sale_id, auth.uid(), 'manual_bonus', p_reason, jsonb_build_object('amount', p_amount));
END $$;

REVOKE ALL ON FUNCTION public.generate_commissions_for_sale(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reverse_commissions_for_sale(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.grant_manual_bonus(UUID, NUMERIC, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grant_manual_bonus(UUID, NUMERIC, TEXT) TO authenticated;
-- generate/reverse are only called from other SECURITY DEFINER functions (approve_sale etc.); no direct grant.
