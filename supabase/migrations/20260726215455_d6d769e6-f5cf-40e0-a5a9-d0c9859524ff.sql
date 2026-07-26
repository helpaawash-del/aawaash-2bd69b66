-- Restrict customer_notes policies to authenticated role
DROP POLICY IF EXISTS "notes select scoped" ON public.customer_notes;
CREATE POLICY "notes select scoped" ON public.customer_notes FOR SELECT TO authenticated
USING (can_access_customer(customer_id) AND ((COALESCE(visibility, 'team') = 'team') OR (author_id = auth.uid()) OR has_role(auth.uid(), 'super_admin')));

DROP POLICY IF EXISTS "notes update scoped" ON public.customer_notes;
CREATE POLICY "notes update scoped" ON public.customer_notes FOR UPDATE TO authenticated
USING (can_access_customer(customer_id) AND ((author_id = auth.uid()) OR has_role(auth.uid(), 'super_admin')))
WITH CHECK (can_access_customer(customer_id) AND ((author_id = auth.uid()) OR has_role(auth.uid(), 'super_admin')));

DROP POLICY IF EXISTS "notes delete scoped" ON public.customer_notes;
CREATE POLICY "notes delete scoped" ON public.customer_notes FOR DELETE TO authenticated
USING (can_access_customer(customer_id) AND ((author_id = auth.uid()) OR has_role(auth.uid(), 'super_admin')));

-- Restrict sales read policy to authenticated role
DROP POLICY IF EXISTS "sales_read" ON public.sales;
CREATE POLICY "sales_read" ON public.sales FOR SELECT TO authenticated
USING ((seller_id = auth.uid()) OR (created_by = auth.uid()) OR has_role(auth.uid(), 'super_admin')
  OR (has_role(auth.uid(), 'team_leader') AND (team_id = my_team_id()) AND (COALESCE(contact_visible, true) = true)));

-- cms-media bucket: explicit policies (admin-managed writes, public read)
DROP POLICY IF EXISTS "cms-media public read" ON storage.objects;
CREATE POLICY "cms-media public read" ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'cms-media');

DROP POLICY IF EXISTS "cms-media admin insert" ON storage.objects;
CREATE POLICY "cms-media admin insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'cms-media' AND has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "cms-media admin update" ON storage.objects;
CREATE POLICY "cms-media admin update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'cms-media' AND has_role(auth.uid(), 'super_admin'))
WITH CHECK (bucket_id = 'cms-media' AND has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "cms-media admin delete" ON storage.objects;
CREATE POLICY "cms-media admin delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'cms-media' AND has_role(auth.uid(), 'super_admin'));