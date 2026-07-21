REVOKE ALL ON FUNCTION public.recompute_project_flat_counts(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.flats_sync_counts() FROM PUBLIC, anon, authenticated;