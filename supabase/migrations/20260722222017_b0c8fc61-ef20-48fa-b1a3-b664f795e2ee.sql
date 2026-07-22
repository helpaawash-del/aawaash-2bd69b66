
-- 1) customer_notes: enforce visibility for SELECT/UPDATE/DELETE
DROP POLICY IF EXISTS "notes select scoped" ON public.customer_notes;
CREATE POLICY "notes select scoped" ON public.customer_notes
  FOR SELECT
  USING (
    can_access_customer(customer_id)
    AND (
      COALESCE(visibility, 'team') = 'team'
      OR author_id = auth.uid()
      OR has_role(auth.uid(), 'super_admin'::app_role)
    )
  );

DROP POLICY IF EXISTS "notes update scoped" ON public.customer_notes;
CREATE POLICY "notes update scoped" ON public.customer_notes
  FOR UPDATE
  USING (
    can_access_customer(customer_id)
    AND (author_id = auth.uid() OR has_role(auth.uid(), 'super_admin'::app_role))
  )
  WITH CHECK (
    can_access_customer(customer_id)
    AND (author_id = auth.uid() OR has_role(auth.uid(), 'super_admin'::app_role))
  );

DROP POLICY IF EXISTS "notes delete scoped" ON public.customer_notes;
CREATE POLICY "notes delete scoped" ON public.customer_notes
  FOR DELETE
  USING (
    can_access_customer(customer_id)
    AND (author_id = auth.uid() OR has_role(auth.uid(), 'super_admin'::app_role))
  );

-- 2) sales: enforce contact_visible for team-leader row visibility
DROP POLICY IF EXISTS "sales_read" ON public.sales;
CREATE POLICY "sales_read" ON public.sales
  FOR SELECT
  USING (
    seller_id = auth.uid()
    OR created_by = auth.uid()
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR (
      has_role(auth.uid(), 'team_leader'::app_role)
      AND team_id = my_team_id()
      AND COALESCE(contact_visible, true) = true
    )
  );

-- 3) Revoke anon EXECUTE on all SECURITY DEFINER functions in public
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon',
                   r.proname, r.args);
  END LOOP;
END $$;

-- 4) Revoke authenticated EXECUTE on trigger + internal-only SECURITY DEFINER functions
DO $$
DECLARE
  fn text;
  fns text[] := ARRAY[
    'assets_touch_updated_at()',
    'cms_touch_updated_at()',
    'set_updated_at()',
    'withdrawals_before_write()',
    'flats_sync_counts()',
    'sales_guard_self_update()',
    'profiles_guard_self_update()',
    'handle_new_user()',
    'recompute_project_flat_counts(uuid)',
    'generate_commissions_for_sale(uuid)',
    'reverse_commissions_for_sale(uuid, text)',
    'asset_recompute_usage(uuid)',
    'asset_register_usage(uuid, text, text, text, text)',
    'asset_unregister_usage(uuid, text, text)'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', fn);
    EXCEPTION WHEN undefined_function THEN NULL;
    END;
  END LOOP;
END $$;
