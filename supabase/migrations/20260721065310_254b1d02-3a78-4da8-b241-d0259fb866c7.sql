
-- =========================================================
-- system_settings (singleton)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.system_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  company_name TEXT NOT NULL DEFAULT 'Aawash',
  company_email TEXT,
  company_phone TEXT,
  company_address TEXT,
  maintenance_mode BOOLEAN NOT NULL DEFAULT false,
  maintenance_message TEXT,
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  theme TEXT NOT NULL DEFAULT 'forest-gold',
  extra JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_settings: admin reads" ON public.system_settings;
CREATE POLICY "system_settings: admin reads" ON public.system_settings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "system_settings: admin updates" ON public.system_settings;
CREATE POLICY "system_settings: admin updates" ON public.system_settings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

DROP TRIGGER IF EXISTS set_updated_at_system_settings ON public.system_settings;
CREATE TRIGGER set_updated_at_system_settings
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.system_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- system_job_runs — background job history
-- =========================================================
CREATE TABLE IF NOT EXISTS public.system_job_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  duration_ms INT,
  result JSONB,
  error TEXT
);

CREATE INDEX IF NOT EXISTS system_job_runs_started_idx
  ON public.system_job_runs (started_at DESC);
CREATE INDEX IF NOT EXISTS system_job_runs_job_idx
  ON public.system_job_runs (job_name, started_at DESC);

GRANT SELECT ON public.system_job_runs TO authenticated;
GRANT ALL ON public.system_job_runs TO service_role;

ALTER TABLE public.system_job_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_job_runs: admin reads" ON public.system_job_runs;
CREATE POLICY "system_job_runs: admin reads" ON public.system_job_runs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- =========================================================
-- system_get_health()
-- =========================================================
CREATE OR REPLACE FUNCTION public.system_get_health()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v JSONB;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  SELECT jsonb_build_object(
    'users_total',        (SELECT COUNT(*) FROM public.profiles),
    'users_active',       (SELECT COUNT(*) FROM public.profiles WHERE COALESCE(is_active,true) = true),
    'projects_total',     (SELECT COUNT(*) FROM public.projects),
    'flats_total',        (SELECT COUNT(*) FROM public.flats),
    'flats_available',    (SELECT COUNT(*) FROM public.flats WHERE status='available'),
    'flats_reserved',     (SELECT COUNT(*) FROM public.flats WHERE status='reserved'),
    'flats_sold',         (SELECT COUNT(*) FROM public.flats WHERE status='sold'),
    'customers_total',    (SELECT COUNT(*) FROM public.customers),
    'sales_pending',      (SELECT COUNT(*) FROM public.sales WHERE approval_status IN ('pending','submitted')),
    'sales_approved_30d', (SELECT COUNT(*) FROM public.sales WHERE approval_status='approved' AND approval_at > now() - interval '30 days'),
    'withdrawals_pending',(SELECT COUNT(*) FROM public.withdrawals WHERE status IN ('pending','approved','processing')),
    'wallet_available_total',(SELECT COALESCE(SUM(wallet_balance),0) FROM public.profiles),
    'wallet_locked_total',(SELECT COALESCE(SUM(locked_balance),0) FROM public.profiles),
    'notifications_unread',(SELECT COUNT(*) FROM public.notifications WHERE is_read=false),
    'active_flat_locks',  (SELECT COUNT(*) FROM public.flat_locks WHERE released=false AND expires_at > now()),
    'expired_flat_locks', (SELECT COUNT(*) FROM public.flat_locks WHERE released=false AND expires_at <= now()),
    'last_job_run',       (SELECT to_jsonb(j) FROM (SELECT job_name, status, started_at, finished_at, duration_ms FROM public.system_job_runs ORDER BY started_at DESC LIMIT 1) j),
    'generated_at',       now()
  ) INTO v;

  RETURN v;
END $$;

-- =========================================================
-- system_run_integrity_checks()
-- =========================================================
CREATE OR REPLACE FUNCTION public.system_run_integrity_checks()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_flat_issues JSONB;
  v_wallet_issues JSONB;
  v_commission_issues JSONB;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  -- Projects: total_flats vs sum of statuses on flats
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
    INTO v_flat_issues
  FROM (
    SELECT p.id AS project_id, p.name,
           p.total_flats AS reported_total,
           COALESCE(f.total,0) AS actual_total,
           p.available_flats AS reported_available,
           COALESCE(f.available,0) AS actual_available,
           p.reserved_flats AS reported_reserved,
           COALESCE(f.reserved,0) AS actual_reserved,
           p.sold_flats AS reported_sold,
           COALESCE(f.sold,0) AS actual_sold
    FROM public.projects p
    LEFT JOIN (
      SELECT project_id,
             COUNT(*) AS total,
             COUNT(*) FILTER (WHERE status='available') AS available,
             COUNT(*) FILTER (WHERE status='reserved')  AS reserved,
             COUNT(*) FILTER (WHERE status='sold')      AS sold
        FROM public.flats GROUP BY project_id
    ) f ON f.project_id = p.id
    WHERE COALESCE(p.total_flats,0)     <> COALESCE(f.total,0)
       OR COALESCE(p.available_flats,0) <> COALESCE(f.available,0)
       OR COALESCE(p.reserved_flats,0)  <> COALESCE(f.reserved,0)
       OR COALESCE(p.sold_flats,0)      <> COALESCE(f.sold,0)
  ) t;

  -- Wallet: profile.wallet_balance vs (sum credits - sum debits) from commission_ledger
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
    INTO v_wallet_issues
  FROM (
    SELECT p.id AS user_id, p.full_name,
           COALESCE(p.wallet_balance,0) AS reported_balance,
           COALESCE(l.net,0)            AS ledger_net
    FROM public.profiles p
    LEFT JOIN (
      SELECT user_id, SUM(COALESCE(credit,0) - COALESCE(debit,0)) AS net
        FROM public.commission_ledger
        WHERE user_id IS NOT NULL
        GROUP BY user_id
    ) l ON l.user_id = p.id
    WHERE ROUND(COALESCE(p.wallet_balance,0)::numeric,2)
        <> ROUND(COALESCE(l.net,0)::numeric,2)
  ) t;

  -- Commission transactions: leader_gross should equal member+tip+net_leader-bonus
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
    INTO v_commission_issues
  FROM (
    SELECT id, txn_number, sale_id, leader_gross, member_amount, tip_amount, bonus_amount, net_leader,
           (leader_gross - member_amount - tip_amount + bonus_amount) AS expected_net_leader
    FROM public.commission_transactions
    WHERE status <> 'reversed'
      AND ROUND((leader_gross - member_amount - tip_amount + bonus_amount)::numeric, 2)
          <> ROUND(net_leader::numeric, 2)
  ) t;

  RETURN jsonb_build_object(
    'generated_at', now(),
    'flat_count_issues',     v_flat_issues,
    'wallet_balance_issues', v_wallet_issues,
    'commission_math_issues',v_commission_issues,
    'summary', jsonb_build_object(
      'flat_count_issues',     jsonb_array_length(v_flat_issues),
      'wallet_balance_issues', jsonb_array_length(v_wallet_issues),
      'commission_math_issues',jsonb_array_length(v_commission_issues)
    )
  );
END $$;

-- =========================================================
-- system_cleanup_expired_locks()
-- =========================================================
CREATE OR REPLACE FUNCTION public.system_cleanup_expired_locks()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_released INT := 0;
  v_freed INT := 0;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'super_admin') OR auth.uid() IS NULL) THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  WITH released AS (
    UPDATE public.flat_locks
       SET released = true
     WHERE released = false AND expires_at <= now()
     RETURNING flat_id
  )
  SELECT COUNT(*) INTO v_released FROM released;

  -- Free flats reserved by expired locks that have no active draft sale
  WITH candidates AS (
    SELECT DISTINCT fl.id
      FROM public.flats fl
     WHERE fl.status = 'reserved'
       AND NOT EXISTS (
         SELECT 1 FROM public.flat_locks lk
          WHERE lk.flat_id = fl.id AND lk.released = false AND lk.expires_at > now()
       )
       AND NOT EXISTS (
         SELECT 1 FROM public.sales s
          WHERE s.flat_id = fl.id
            AND s.sale_status IN ('flat_locked','pending_approval','approved')
            AND s.approval_status NOT IN ('cancelled','rejected')
       )
  ), freed AS (
    UPDATE public.flats
       SET status = 'available', booking_status = 'open'
     WHERE id IN (SELECT id FROM candidates)
     RETURNING id
  )
  SELECT COUNT(*) INTO v_freed FROM freed;

  RETURN jsonb_build_object('locks_released', v_released, 'flats_freed', v_freed);
END $$;

-- =========================================================
-- system_run_maintenance() — orchestrator
-- =========================================================
CREATE OR REPLACE FUNCTION public.system_run_maintenance()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id UUID;
  v_start TIMESTAMPTZ := now();
  v_cleanup JSONB;
  v_result JSONB;
BEGIN
  INSERT INTO public.system_job_runs (job_name, status)
    VALUES ('system_maintenance', 'running')
    RETURNING id INTO v_id;

  BEGIN
    v_cleanup := public.system_cleanup_expired_locks();

    v_result := jsonb_build_object(
      'cleanup', v_cleanup,
      'notifications_purged', (
        WITH d AS (
          DELETE FROM public.notifications
           WHERE is_read = true AND created_at < now() - interval '60 days'
           RETURNING 1
        ) SELECT COUNT(*) FROM d
      )
    );

    UPDATE public.system_job_runs
       SET status='success', finished_at=now(),
           duration_ms = EXTRACT(MILLISECONDS FROM (now()-v_start))::int,
           result = v_result
     WHERE id = v_id;

    RETURN v_result;
  EXCEPTION WHEN OTHERS THEN
    UPDATE public.system_job_runs
       SET status='failed', finished_at=now(),
           duration_ms = EXTRACT(MILLISECONDS FROM (now()-v_start))::int,
           error = SQLERRM
     WHERE id = v_id;
    RAISE;
  END;
END $$;

-- Helpful indexes for hot analytics/queries (idempotent)
CREATE INDEX IF NOT EXISTS sales_approval_at_idx ON public.sales (approval_at DESC);
CREATE INDEX IF NOT EXISTS sales_created_at_idx  ON public.sales (created_at DESC);
CREATE INDEX IF NOT EXISTS commissions_created_at_idx ON public.commissions (created_at DESC);
CREATE INDEX IF NOT EXISTS commission_ledger_user_created_idx ON public.commission_ledger (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS withdrawals_status_idx ON public.withdrawals (status, requested_at DESC);
CREATE INDEX IF NOT EXISTS customers_assigned_member_idx ON public.customers (assigned_member_id);
