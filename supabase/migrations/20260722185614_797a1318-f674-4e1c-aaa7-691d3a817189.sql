
REVOKE EXECUTE ON FUNCTION public.asset_recompute_usage(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.asset_register_usage(uuid, text, text, text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.asset_unregister_usage(uuid, text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.asset_replace(uuid, text, bigint, text, int, int, numeric, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.asset_rollback(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.asset_soft_delete(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.asset_restore(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.asset_dashboard_stats() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.asset_recompute_usage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.asset_register_usage(uuid, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.asset_unregister_usage(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.asset_replace(uuid, text, bigint, text, int, int, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.asset_rollback(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.asset_soft_delete(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.asset_restore(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.asset_dashboard_stats() TO authenticated;
