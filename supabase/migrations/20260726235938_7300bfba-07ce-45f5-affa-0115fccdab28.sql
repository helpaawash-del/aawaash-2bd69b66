
-- CMS media: replace blanket public read with visibility-aware read
DROP POLICY IF EXISTS "cms-media public read" ON storage.objects;

CREATE POLICY "cms-media public read published assets"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'cms-media'
  AND EXISTS (
    SELECT 1 FROM public.assets a
    WHERE a.storage_path = storage.objects.name
      AND a.is_public = true
      AND a.status = 'active'
  )
);

CREATE POLICY "cms-media admin read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'cms-media' AND public.has_role(auth.uid(), 'super_admin')
);

-- Customer documents: align storage reads with can_access_customer
CREATE POLICY "customer-docs authorized read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'customer-documents'
  AND EXISTS (
    SELECT 1 FROM public.customer_documents d
    WHERE d.storage_path = storage.objects.name
      AND public.can_access_customer(d.customer_id)
  )
);
