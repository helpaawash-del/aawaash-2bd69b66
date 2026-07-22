
DROP POLICY IF EXISTS "auth read usage" ON public.asset_usage;
CREATE POLICY "admin read usage" ON public.asset_usage FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "auth read versions" ON public.asset_versions;
CREATE POLICY "admin read versions" ON public.asset_versions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "settings read" ON public.commission_settings;
CREATE POLICY "settings read privileged" ON public.commission_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'team_leader'));

DROP POLICY IF EXISTS "slabs read" ON public.commission_slabs;
CREATE POLICY "slabs read privileged" ON public.commission_slabs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'team_leader'));

DROP POLICY IF EXISTS "tags read all" ON public.customer_tags_catalog;
CREATE POLICY "tags read role" ON public.customer_tags_catalog FOR SELECT TO authenticated
  USING (public.current_user_role() IS NOT NULL);
