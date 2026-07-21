
-- =============================================================
-- Sales Workflow Engine
-- =============================================================

-- Sale-number sequence
CREATE SEQUENCE IF NOT EXISTS public.sales_number_seq START 100001;

-- Extend sales table
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS sale_number TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS building_id UUID REFERENCES public.buildings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS floor_id UUID REFERENCES public.floors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS flat_id UUID REFERENCES public.flats(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS leader_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS booking_date DATE,
  ADD COLUMN IF NOT EXISTS agreement_date DATE,
  ADD COLUMN IF NOT EXISTS registration_date DATE,
  ADD COLUMN IF NOT EXISTS booking_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remaining_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sale_status TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approval_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS extra JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Backfill sale numbers for any legacy rows
UPDATE public.sales
   SET sale_number = 'ASH-' || LPAD(nextval('public.sales_number_seq')::text, 6, '0')
 WHERE sale_number IS NULL;

-- Sale-status check
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sales_sale_status_chk'
  ) THEN
    ALTER TABLE public.sales ADD CONSTRAINT sales_sale_status_chk CHECK (
      sale_status IN (
        'draft','flat_locked','negotiation','documents_submitted',
        'booking_received','verification','pending_approval',
        'approved','rejected','cancelled','on_hold',
        'documentation_pending','loan_processing','registration_pending',
        'registered','completed','expired','refunded'
      )
    );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sales_approval_status_chk'
  ) THEN
    ALTER TABLE public.sales ADD CONSTRAINT sales_approval_status_chk CHECK (
      approval_status IN ('pending','submitted','approved','rejected','cancelled','changes_requested','hold')
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS sales_flat_id_idx ON public.sales(flat_id);
CREATE INDEX IF NOT EXISTS sales_customer_id_idx ON public.sales(customer_id);
CREATE INDEX IF NOT EXISTS sales_sale_status_idx ON public.sales(sale_status);
CREATE INDEX IF NOT EXISTS sales_approval_status_idx ON public.sales(approval_status);

DROP TRIGGER IF EXISTS trg_sales_updated ON public.sales;
CREATE TRIGGER trg_sales_updated BEFORE UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Refresh member/leader RLS so they can create drafts & update their own
DROP POLICY IF EXISTS "sales: readable to owner, team leader, admin" ON public.sales;
DROP POLICY IF EXISTS "sales: super admin manages" ON public.sales;

CREATE POLICY "sales_read" ON public.sales FOR SELECT TO authenticated USING (
  seller_id = auth.uid()
  OR created_by = auth.uid()
  OR has_role(auth.uid(),'super_admin')
  OR (has_role(auth.uid(),'team_leader') AND team_id = public.my_team_id())
);

CREATE POLICY "sales_member_insert" ON public.sales FOR INSERT TO authenticated
  WITH CHECK (
    (seller_id = auth.uid() OR created_by = auth.uid())
    AND sale_status IN ('draft','flat_locked','negotiation','documents_submitted','booking_received','verification','pending_approval')
  );

CREATE POLICY "sales_member_update_own_draft" ON public.sales FOR UPDATE TO authenticated
  USING (
    (seller_id = auth.uid() OR created_by = auth.uid())
    AND approval_status IN ('pending','submitted','changes_requested')
  )
  WITH CHECK (
    (seller_id = auth.uid() OR created_by = auth.uid())
    AND approval_status IN ('pending','submitted','changes_requested')
  );

CREATE POLICY "sales_admin_manage" ON public.sales FOR ALL TO authenticated
  USING (has_role(auth.uid(),'super_admin'))
  WITH CHECK (has_role(auth.uid(),'super_admin'));

-- =============================================================
-- sale_documents
-- =============================================================
CREATE TABLE IF NOT EXISTS public.sale_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  label TEXT,
  file_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected','replaced')),
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_documents TO authenticated;
GRANT ALL ON public.sale_documents TO service_role;
ALTER TABLE public.sale_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sale_documents_read" ON public.sale_documents FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_id AND (
    s.seller_id = auth.uid() OR s.created_by = auth.uid()
    OR has_role(auth.uid(),'super_admin')
    OR (has_role(auth.uid(),'team_leader') AND s.team_id = public.my_team_id())
  ))
);

CREATE POLICY "sale_documents_member_write" ON public.sale_documents FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_id AND (s.seller_id = auth.uid() OR s.created_by = auth.uid()))
  );

CREATE POLICY "sale_documents_member_update" ON public.sale_documents FOR UPDATE TO authenticated
  USING (uploaded_by = auth.uid())
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "sale_documents_admin" ON public.sale_documents FOR ALL TO authenticated
  USING (has_role(auth.uid(),'super_admin'))
  WITH CHECK (has_role(auth.uid(),'super_admin'));

DROP TRIGGER IF EXISTS trg_sale_docs_updated ON public.sale_documents;
CREATE TRIGGER trg_sale_docs_updated BEFORE UPDATE ON public.sale_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================
-- sale_payments
-- =============================================================
CREATE TABLE IF NOT EXISTS public.sale_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  stage TEXT NOT NULL CHECK (stage IN ('booking','first_installment','second_installment','third_installment','final','registration','other')),
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  method TEXT,
  reference TEXT,
  receipt_url TEXT,
  received_on DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_payments TO authenticated;
GRANT ALL ON public.sale_payments TO service_role;
ALTER TABLE public.sale_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sale_payments_read" ON public.sale_payments FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_id AND (
    s.seller_id = auth.uid() OR s.created_by = auth.uid()
    OR has_role(auth.uid(),'super_admin')
    OR (has_role(auth.uid(),'team_leader') AND s.team_id = public.my_team_id())
  ))
);

CREATE POLICY "sale_payments_member_write" ON public.sale_payments FOR INSERT TO authenticated
  WITH CHECK (
    recorded_by = auth.uid()
    AND EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_id AND (s.seller_id = auth.uid() OR s.created_by = auth.uid()))
  );

CREATE POLICY "sale_payments_admin" ON public.sale_payments FOR ALL TO authenticated
  USING (has_role(auth.uid(),'super_admin'))
  WITH CHECK (has_role(auth.uid(),'super_admin'));

DROP TRIGGER IF EXISTS trg_sale_payments_updated ON public.sale_payments;
CREATE TRIGGER trg_sale_payments_updated BEFORE UPDATE ON public.sale_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================
-- sale_audit_log  (immutable)
-- =============================================================
CREATE TABLE IF NOT EXISTS public.sale_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role TEXT,
  action TEXT NOT NULL,
  from_value JSONB,
  to_value JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.sale_audit_log TO authenticated;
GRANT ALL ON public.sale_audit_log TO service_role;
ALTER TABLE public.sale_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sale_audit_read" ON public.sale_audit_log FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_id AND (
    s.seller_id = auth.uid() OR s.created_by = auth.uid()
    OR has_role(auth.uid(),'super_admin')
    OR (has_role(auth.uid(),'team_leader') AND s.team_id = public.my_team_id())
  ))
);
CREATE POLICY "sale_audit_insert_own" ON public.sale_audit_log FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid() OR has_role(auth.uid(),'super_admin'));

CREATE INDEX IF NOT EXISTS sale_audit_sale_id_idx ON public.sale_audit_log(sale_id);
CREATE INDEX IF NOT EXISTS sale_docs_sale_id_idx ON public.sale_documents(sale_id);
CREATE INDEX IF NOT EXISTS sale_payments_sale_id_idx ON public.sale_payments(sale_id);

-- =============================================================
-- Atomic RPCs
-- =============================================================

-- Create draft sale + lock flat atomically
CREATE OR REPLACE FUNCTION public.create_draft_sale(
  p_customer_id UUID,
  p_flat_id UUID,
  p_sale_amount NUMERIC,
  p_booking_amount NUMERIC,
  p_notes TEXT DEFAULT NULL,
  p_lock_minutes INT DEFAULT 1440
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_role app_role;
  v_flat RECORD;
  v_customer RECORD;
  v_team_id UUID;
  v_leader_id UUID;
  v_sale_id UUID;
  v_sale_number TEXT;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Authorized roles
  SELECT public.current_user_role() INTO v_role;
  IF v_role IS NULL THEN RAISE EXCEPTION 'No role assigned'; END IF;

  -- Validate customer & ownership
  SELECT * INTO v_customer FROM public.customers WHERE id = p_customer_id;
  IF v_customer IS NULL THEN RAISE EXCEPTION 'Customer not found'; END IF;
  IF v_role = 'member' AND v_customer.assigned_member_id <> v_user THEN
    RAISE EXCEPTION 'You can only start sales for your own customers';
  END IF;

  -- Validate flat & availability (row lock)
  SELECT * INTO v_flat FROM public.flats WHERE id = p_flat_id FOR UPDATE;
  IF v_flat IS NULL THEN RAISE EXCEPTION 'Flat not found'; END IF;
  IF v_flat.status <> 'available' THEN
    RAISE EXCEPTION 'Flat % is not available (status: %)', v_flat.unit_code, v_flat.status;
  END IF;

  -- Existing active lock?
  IF EXISTS (
    SELECT 1 FROM public.flat_locks
     WHERE flat_id = p_flat_id AND released = false AND expires_at > now()
  ) THEN
    RAISE EXCEPTION 'Flat is currently locked by another draft sale';
  END IF;

  -- Resolve team + leader
  SELECT team_id INTO v_team_id FROM public.profiles WHERE id = v_user;
  IF v_team_id IS NOT NULL THEN
    SELECT leader_id INTO v_leader_id FROM public.teams WHERE id = v_team_id;
  END IF;

  v_sale_number := 'ASH-' || LPAD(nextval('public.sales_number_seq')::text, 6, '0');

  INSERT INTO public.sales (
    sale_number, customer_id, project_id, building_id, floor_id, flat_id,
    seller_id, leader_id, team_id, created_by,
    buyer_name, buyer_mobile, unit_label,
    deal_value, booking_amount, remaining_amount,
    sale_status, approval_status, status, notes
  ) VALUES (
    v_sale_number, p_customer_id, v_flat.project_id, v_flat.building_id, v_flat.floor_id, p_flat_id,
    v_user, v_leader_id, v_team_id, v_user,
    v_customer.full_name, v_customer.mobile_number, v_flat.unit_code,
    p_sale_amount, COALESCE(p_booking_amount,0), GREATEST(p_sale_amount - COALESCE(p_booking_amount,0), 0),
    'flat_locked', 'pending', 'draft', p_notes
  ) RETURNING id INTO v_sale_id;

  -- Lock flat inventory
  UPDATE public.flats
     SET status = 'reserved', booking_status = 'locked'
   WHERE id = p_flat_id;

  INSERT INTO public.flat_locks (flat_id, locked_by, reason, expires_at)
  VALUES (p_flat_id, v_user, 'draft_sale:' || v_sale_id::text, now() + make_interval(mins => p_lock_minutes));

  -- Audit
  INSERT INTO public.sale_audit_log (sale_id, actor_id, actor_role, action, to_value)
  VALUES (v_sale_id, v_user, v_role::text, 'sale_draft_created',
          jsonb_build_object('flat_id', p_flat_id, 'amount', p_sale_amount));

  -- Customer timeline
  INSERT INTO public.customer_timeline (customer_id, actor_id, event_type, title, description, metadata)
  VALUES (p_customer_id, v_user, 'sale_draft', 'Sale draft created',
          'Draft sale ' || v_sale_number || ' for flat ' || v_flat.unit_code,
          jsonb_build_object('sale_id', v_sale_id, 'flat_id', p_flat_id));

  RETURN v_sale_id;
END $$;

-- Approve sale atomically
CREATE OR REPLACE FUNCTION public.approve_sale(p_sale_id UUID, p_notes TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_sale RECORD;
  v_commission_rate NUMERIC := 0.02; -- 2% seller commission trigger baseline
  v_leader_rate NUMERIC := 0.005;    -- 0.5% team-leader override
  v_seller_amt NUMERIC;
  v_leader_amt NUMERIC;
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

  -- Ensure flat still valid
  IF v_sale.flat_id IS NULL THEN RAISE EXCEPTION 'Sale has no flat attached'; END IF;

  UPDATE public.sales
     SET sale_status = 'approved',
         approval_status = 'approved',
         status = 'confirmed',
         approved_by = v_user,
         approval_at = now(),
         notes = COALESCE(notes,'') || CASE WHEN p_notes IS NULL THEN '' ELSE E'\n[approval] ' || p_notes END
   WHERE id = p_sale_id;

  -- Mark flat sold + release lock
  UPDATE public.flats
     SET status = 'sold', booking_status = 'closed'
   WHERE id = v_sale.flat_id;
  UPDATE public.flat_locks
     SET released = true
   WHERE flat_id = v_sale.flat_id AND released = false;

  -- Commissions (triggers only — payout handled elsewhere)
  v_seller_amt := round(v_sale.deal_value * v_commission_rate, 2);
  INSERT INTO public.commissions (sale_id, user_id, team_id, tier, amount, status)
  VALUES (p_sale_id, v_sale.seller_id, v_sale.team_id, 1, v_seller_amt, 'pending');

  IF v_sale.leader_id IS NOT NULL AND v_sale.leader_id <> v_sale.seller_id THEN
    v_leader_amt := round(v_sale.deal_value * v_leader_rate, 2);
    INSERT INTO public.commissions (sale_id, user_id, team_id, tier, amount, status)
    VALUES (p_sale_id, v_sale.leader_id, v_sale.team_id, 2, v_leader_amt, 'pending');
  END IF;

  -- Update customer
  IF v_sale.customer_id IS NOT NULL THEN
    UPDATE public.customers
       SET status = 'sale_completed', updated_at = now()
     WHERE id = v_sale.customer_id;

    INSERT INTO public.customer_timeline (customer_id, actor_id, event_type, title, description, metadata)
    VALUES (v_sale.customer_id, v_user, 'sale_approved', 'Sale approved',
            'Sale ' || v_sale.sale_number || ' approved',
            jsonb_build_object('sale_id', p_sale_id));
  END IF;

  -- Notifications
  INSERT INTO public.notifications (user_id, kind, title, body, metadata)
  VALUES
    (v_sale.seller_id, 'sale_approved', 'Sale approved',
     'Your sale ' || v_sale.sale_number || ' has been approved.',
     jsonb_build_object('sale_id', p_sale_id));

  IF v_sale.leader_id IS NOT NULL AND v_sale.leader_id <> v_sale.seller_id THEN
    INSERT INTO public.notifications (user_id, kind, title, body, metadata)
    VALUES (v_sale.leader_id, 'sale_approved', 'Team sale approved',
            'Sale ' || v_sale.sale_number || ' approved.',
            jsonb_build_object('sale_id', p_sale_id));
  END IF;

  INSERT INTO public.sale_audit_log (sale_id, actor_id, actor_role, action, to_value, reason)
  VALUES (p_sale_id, v_user, 'super_admin', 'sale_approved',
          jsonb_build_object('approved_at', now()), p_notes);
END $$;

-- Reject or cancel
CREATE OR REPLACE FUNCTION public.reject_sale(p_sale_id UUID, p_reason TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
END $$;

CREATE OR REPLACE FUNCTION public.cancel_sale(p_sale_id UUID, p_reason TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_sale RECORD;
  v_role app_role;
BEGIN
  SELECT public.current_user_role() INTO v_role;
  SELECT * INTO v_sale FROM public.sales WHERE id = p_sale_id FOR UPDATE;
  IF v_sale IS NULL THEN RAISE EXCEPTION 'Sale not found'; END IF;

  -- Members may cancel their own drafts before approval; Admin any time.
  IF v_role = 'super_admin' THEN
    NULL;
  ELSIF (v_sale.seller_id = v_user OR v_sale.created_by = v_user)
     AND v_sale.approval_status IN ('pending','submitted','changes_requested') THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'Not permitted to cancel this sale';
  END IF;

  UPDATE public.sales
     SET sale_status = 'cancelled', approval_status = 'cancelled',
         status = 'cancelled', cancellation_reason = p_reason
   WHERE id = p_sale_id;

  IF v_sale.flat_id IS NOT NULL AND v_sale.sale_status <> 'approved' THEN
    UPDATE public.flats SET status = 'available', booking_status = 'open' WHERE id = v_sale.flat_id;
    UPDATE public.flat_locks SET released = true WHERE flat_id = v_sale.flat_id AND released = false;
    -- Reverse commissions if any were created (safety, though only approve creates them)
    UPDATE public.commissions SET status = 'cancelled' WHERE sale_id = p_sale_id AND status = 'pending';
  END IF;

  IF v_sale.customer_id IS NOT NULL THEN
    INSERT INTO public.customer_timeline (customer_id, actor_id, event_type, title, description, metadata)
    VALUES (v_sale.customer_id, v_user, 'sale_cancelled', 'Sale cancelled',
            'Sale ' || v_sale.sale_number || ' cancelled: ' || COALESCE(p_reason,''),
            jsonb_build_object('sale_id', p_sale_id));
  END IF;

  INSERT INTO public.sale_audit_log (sale_id, actor_id, actor_role, action, reason)
  VALUES (p_sale_id, v_user, COALESCE(v_role::text,'member'), 'sale_cancelled', p_reason);
END $$;

-- Submit for approval (member → admin queue)
CREATE OR REPLACE FUNCTION public.submit_sale_for_approval(p_sale_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_sale RECORD;
BEGIN
  SELECT * INTO v_sale FROM public.sales WHERE id = p_sale_id FOR UPDATE;
  IF v_sale IS NULL THEN RAISE EXCEPTION 'Sale not found'; END IF;
  IF v_sale.seller_id <> v_user AND v_sale.created_by <> v_user AND NOT has_role(v_user,'super_admin') THEN
    RAISE EXCEPTION 'Not permitted';
  END IF;

  UPDATE public.sales
     SET sale_status = 'pending_approval', approval_status = 'submitted'
   WHERE id = p_sale_id;

  -- Notify all admins
  INSERT INTO public.notifications (user_id, kind, title, body, metadata)
  SELECT ur.user_id, 'sale_pending', 'Sale awaiting approval',
         'Sale ' || v_sale.sale_number || ' is awaiting approval.',
         jsonb_build_object('sale_id', p_sale_id)
    FROM public.user_roles ur WHERE ur.role = 'super_admin';

  INSERT INTO public.sale_audit_log (sale_id, actor_id, actor_role, action)
  VALUES (p_sale_id, v_user, 'member', 'submitted_for_approval');
END $$;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sale_documents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sale_payments;
