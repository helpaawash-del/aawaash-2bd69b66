
REVOKE ALL ON FUNCTION public.create_draft_sale(uuid, uuid, numeric, numeric, text, int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.approve_sale(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reject_sale(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_sale(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_sale_for_approval(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_draft_sale(uuid, uuid, numeric, numeric, text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_sale(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_sale(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_sale(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_sale_for_approval(uuid) TO authenticated;
