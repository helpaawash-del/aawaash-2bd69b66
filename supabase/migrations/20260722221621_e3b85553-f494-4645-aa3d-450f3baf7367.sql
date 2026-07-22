
CREATE POLICY "project-media admin write"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'project-media' AND public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "project-media admin update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'project-media' AND public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "project-media admin delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'project-media' AND public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "project-media authenticated read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'project-media');
