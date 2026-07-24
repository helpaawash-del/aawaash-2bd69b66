
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS gallery text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS videos text[] NOT NULL DEFAULT '{}'::text[];
