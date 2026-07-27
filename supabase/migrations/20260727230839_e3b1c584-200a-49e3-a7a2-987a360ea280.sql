-- 1) CMS pages: respect visibility + scheduling window
DROP POLICY IF EXISTS "public read published pages" ON public.cms_pages;

CREATE POLICY "public read published pages"
ON public.cms_pages
FOR SELECT
TO anon, authenticated
USING (
  status = 'published'
  AND visibility = 'public'
  AND (visible_from IS NULL OR visible_from <= now())
  AND (visible_until IS NULL OR visible_until > now())
);

-- 2) Teams: scope reads to own team / led teams / admins
DROP POLICY IF EXISTS "teams: authenticated read" ON public.teams;

CREATE POLICY "teams: scoped read"
ON public.teams
FOR SELECT
TO authenticated
USING (
  is_deleted = false
  AND (
    id = public.current_team_id()
    OR leader_id = auth.uid()
    OR public.has_role(auth.uid(), 'super_admin')
  )
);