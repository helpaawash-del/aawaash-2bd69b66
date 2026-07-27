DROP POLICY IF EXISTS "profiles: user updates safe fields on own row" ON public.profiles;

CREATE POLICY "profiles: user updates safe fields on own row"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

DROP FUNCTION IF EXISTS public.profiles_protected_unchanged(uuid, numeric, numeric, numeric, numeric, numeric, numeric, account_status, boolean, boolean, text, text, uuid, text, text, jsonb, integer);