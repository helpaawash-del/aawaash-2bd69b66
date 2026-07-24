
ALTER TABLE public.flats REPLICA IDENTITY FULL;
ALTER TABLE public.projects REPLICA IDENTITY FULL;
ALTER TABLE public.customers REPLICA IDENTITY FULL;
ALTER TABLE public.customer_timeline REPLICA IDENTITY FULL;
ALTER TABLE public.sales REPLICA IDENTITY FULL;
ALTER TABLE public.sale_payments REPLICA IDENTITY FULL;
ALTER TABLE public.commission_transactions REPLICA IDENTITY FULL;
ALTER TABLE public.commissions REPLICA IDENTITY FULL;
ALTER TABLE public.commission_ledger REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['flats','projects','customers','customer_timeline','sales','sale_payments','commission_transactions','commissions','commission_ledger','profiles']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
