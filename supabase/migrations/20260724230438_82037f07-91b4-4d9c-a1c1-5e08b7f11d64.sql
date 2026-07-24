
ALTER TABLE public.assets ALTER COLUMN is_public SET DEFAULT false;

DROP POLICY IF EXISTS "project-media authenticated read" ON storage.objects;
CREATE POLICY "project-media admin read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'project-media' AND public.has_role(auth.uid(), 'super_admin'::app_role));
