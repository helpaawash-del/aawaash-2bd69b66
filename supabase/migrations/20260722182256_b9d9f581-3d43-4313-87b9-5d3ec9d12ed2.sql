
CREATE TABLE IF NOT EXISTS public.customer_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  label TEXT,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  version INTEGER NOT NULL DEFAULT 1,
  replaces_id UUID REFERENCES public.customer_documents(id) ON DELETE SET NULL,
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_documents_customer_idx ON public.customer_documents(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS customer_documents_current_idx ON public.customer_documents(customer_id, doc_type) WHERE is_current;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_documents TO authenticated;
GRANT ALL ON public.customer_documents TO service_role;
ALTER TABLE public.customer_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "docs admin all" ON public.customer_documents
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "docs visible via parent" ON public.customer_documents
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_documents.customer_id));

CREATE POLICY "docs insert via parent" ON public.customer_documents
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_documents.customer_id));

CREATE POLICY "docs update own" ON public.customer_documents
  FOR UPDATE TO authenticated
  USING (uploaded_by = auth.uid());

CREATE POLICY "docs delete own" ON public.customer_documents
  FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid());

CREATE TRIGGER trg_customer_documents_updated
  BEFORE UPDATE ON public.customer_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.customer_tags_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL UNIQUE,
  color TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.customer_tags_catalog TO authenticated;
GRANT ALL ON public.customer_tags_catalog TO service_role;
ALTER TABLE public.customer_tags_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tags read all" ON public.customer_tags_catalog
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "tags admin write" ON public.customer_tags_catalog
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE TRIGGER trg_customer_tags_catalog_updated
  BEFORE UPDATE ON public.customer_tags_catalog
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.customer_tags_catalog (label, color) VALUES
  ('VIP','gold'),('Hot Lead','red'),('Cold Lead','slate'),('Investor','emerald'),
  ('Family Buyer','blue'),('Urgent','amber'),('Repeat Customer','violet')
ON CONFLICT (label) DO NOTHING;

CREATE POLICY "customer-docs admin all"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'customer-documents' AND public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (bucket_id = 'customer-documents' AND public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "customer-docs uploader read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'customer-documents' AND owner = auth.uid());

CREATE POLICY "customer-docs uploader insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'customer-documents' AND owner = auth.uid());

CREATE OR REPLACE FUNCTION public.admin_merge_customers(
  _target_id UUID,
  _source_id UUID
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _actor UUID := auth.uid();
  _moved JSONB := '{}'::jsonb;
  n INT;
BEGIN
  IF NOT public.has_role(_actor, 'super_admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only super admins can merge customers';
  END IF;
  IF _target_id = _source_id THEN
    RAISE EXCEPTION 'Cannot merge a customer with itself';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.customers WHERE id = _target_id) THEN
    RAISE EXCEPTION 'Target customer not found';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.customers WHERE id = _source_id) THEN
    RAISE EXCEPTION 'Source customer not found';
  END IF;

  UPDATE public.customer_notes SET customer_id = _target_id WHERE customer_id = _source_id;
  GET DIAGNOSTICS n = ROW_COUNT; _moved := _moved || jsonb_build_object('notes', n);

  UPDATE public.customer_meetings SET customer_id = _target_id WHERE customer_id = _source_id;
  GET DIAGNOSTICS n = ROW_COUNT; _moved := _moved || jsonb_build_object('meetings', n);

  UPDATE public.customer_timeline SET customer_id = _target_id WHERE customer_id = _source_id;
  GET DIAGNOSTICS n = ROW_COUNT; _moved := _moved || jsonb_build_object('timeline', n);

  UPDATE public.customer_documents SET customer_id = _target_id WHERE customer_id = _source_id;
  GET DIAGNOSTICS n = ROW_COUNT; _moved := _moved || jsonb_build_object('documents', n);

  BEGIN
    EXECUTE 'UPDATE public.sales SET customer_id = $1 WHERE customer_id = $2'
      USING _target_id, _source_id;
    GET DIAGNOSTICS n = ROW_COUNT; _moved := _moved || jsonb_build_object('sales', n);
  EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
  END;

  BEGIN
    EXECUTE 'UPDATE public.referrals SET customer_id = $1 WHERE customer_id = $2'
      USING _target_id, _source_id;
    GET DIAGNOSTICS n = ROW_COUNT; _moved := _moved || jsonb_build_object('referrals', n);
  EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
  END;

  UPDATE public.customers
    SET is_archived = TRUE,
        status = 'cancelled',
        notes = COALESCE(notes,'') || E'\n[merged into '||_target_id::text||' by '||_actor::text||' at '||now()::text||']',
        updated_by = _actor,
        updated_at = now()
    WHERE id = _source_id;

  INSERT INTO public.customer_timeline(customer_id, actor_id, event, detail, metadata)
    VALUES (_target_id, _actor, 'customer_merged',
            'Merged from '||_source_id::text,
            jsonb_build_object('source_id', _source_id, 'moved', _moved));

  RETURN jsonb_build_object('ok', TRUE, 'moved', _moved);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_merge_customers(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_merge_customers(UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_bulk_reassign_customers(
  _customer_ids UUID[],
  _team_id UUID,
  _leader_id UUID,
  _member_id UUID
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _actor UUID := auth.uid();
  n INT;
BEGIN
  IF NOT public.has_role(_actor, 'super_admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only super admins can bulk reassign';
  END IF;

  UPDATE public.customers SET
    team_id = COALESCE(_team_id, team_id),
    assigned_leader_id = COALESCE(_leader_id, assigned_leader_id),
    assigned_member_id = COALESCE(_member_id, assigned_member_id),
    updated_by = _actor,
    updated_at = now()
  WHERE id = ANY(_customer_ids);
  GET DIAGNOSTICS n = ROW_COUNT;

  INSERT INTO public.customer_timeline(customer_id, actor_id, event, detail, metadata)
    SELECT id, _actor, 'assigned',
           'Bulk reassignment by admin',
           jsonb_build_object('team_id', _team_id, 'leader_id', _leader_id, 'member_id', _member_id)
    FROM public.customers WHERE id = ANY(_customer_ids);

  RETURN jsonb_build_object('ok', TRUE, 'updated', n);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_bulk_reassign_customers(UUID[], UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_bulk_reassign_customers(UUID[], UUID, UUID, UUID) TO authenticated;
