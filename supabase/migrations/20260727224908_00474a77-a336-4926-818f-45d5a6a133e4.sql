CREATE TABLE public.admin_passcode_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier_hash text NOT NULL,
  success boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX admin_passcode_attempts_lookup_idx
  ON public.admin_passcode_attempts (identifier_hash, created_at DESC);

GRANT ALL ON public.admin_passcode_attempts TO service_role;

ALTER TABLE public.admin_passcode_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view passcode attempts"
  ON public.admin_passcode_attempts
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));