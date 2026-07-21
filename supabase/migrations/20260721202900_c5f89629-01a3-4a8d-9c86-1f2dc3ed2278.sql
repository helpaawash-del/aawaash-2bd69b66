
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS remarks text,
  ADD COLUMN IF NOT EXISTS joining_date date;

-- Seed configurable limits used by the Team Leader console.
UPDATE public.system_settings
   SET extra = COALESCE(extra, '{}'::jsonb)
             || jsonb_build_object(
                  'max_team_leaders',      COALESCE(extra->>'max_team_leaders','3')::int,
                  'max_members_per_team',  COALESCE(extra->>'max_members_per_team','10')::int
                )
 WHERE id = 1;
