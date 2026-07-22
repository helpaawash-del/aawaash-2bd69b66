
-- Helper: consolidated customer access check
CREATE OR REPLACE FUNCTION public.can_access_customer(_customer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = _customer_id
      AND (
        c.assigned_member_id = auth.uid()
        OR c.created_by = auth.uid()
        OR c.team_id IN (SELECT id FROM public.teams WHERE leader_id = auth.uid())
        OR public.has_role(auth.uid(), 'super_admin')
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_access_customer(uuid) TO authenticated;

-- ============ customer_documents ============
DROP POLICY IF EXISTS "docs admin all" ON public.customer_documents;
DROP POLICY IF EXISTS "docs delete own" ON public.customer_documents;
DROP POLICY IF EXISTS "docs insert via parent" ON public.customer_documents;
DROP POLICY IF EXISTS "docs update own" ON public.customer_documents;
DROP POLICY IF EXISTS "docs visible via parent" ON public.customer_documents;

CREATE POLICY "docs select scoped" ON public.customer_documents FOR SELECT TO authenticated
  USING (public.can_access_customer(customer_id));
CREATE POLICY "docs insert scoped" ON public.customer_documents FOR INSERT TO authenticated
  WITH CHECK (public.can_access_customer(customer_id));
CREATE POLICY "docs update scoped" ON public.customer_documents FOR UPDATE TO authenticated
  USING (public.can_access_customer(customer_id) AND (uploaded_by = auth.uid() OR public.has_role(auth.uid(),'super_admin')))
  WITH CHECK (public.can_access_customer(customer_id));
CREATE POLICY "docs delete scoped" ON public.customer_documents FOR DELETE TO authenticated
  USING (public.can_access_customer(customer_id) AND (uploaded_by = auth.uid() OR public.has_role(auth.uid(),'super_admin')));

-- ============ customer_notes ============
DROP POLICY IF EXISTS "notes admin all" ON public.customer_notes;
DROP POLICY IF EXISTS "notes insert via parent" ON public.customer_notes;
DROP POLICY IF EXISTS "notes update own" ON public.customer_notes;
DROP POLICY IF EXISTS "notes visible via parent" ON public.customer_notes;

CREATE POLICY "notes select scoped" ON public.customer_notes FOR SELECT TO authenticated
  USING (public.can_access_customer(customer_id));
CREATE POLICY "notes insert scoped" ON public.customer_notes FOR INSERT TO authenticated
  WITH CHECK (public.can_access_customer(customer_id) AND author_id = auth.uid());
CREATE POLICY "notes update scoped" ON public.customer_notes FOR UPDATE TO authenticated
  USING (public.can_access_customer(customer_id) AND (author_id = auth.uid() OR public.has_role(auth.uid(),'super_admin')))
  WITH CHECK (public.can_access_customer(customer_id));
CREATE POLICY "notes delete scoped" ON public.customer_notes FOR DELETE TO authenticated
  USING (public.can_access_customer(customer_id) AND (author_id = auth.uid() OR public.has_role(auth.uid(),'super_admin')));

-- ============ customer_meetings ============
DROP POLICY IF EXISTS "meetings admin all" ON public.customer_meetings;
DROP POLICY IF EXISTS "meetings insert via parent" ON public.customer_meetings;
DROP POLICY IF EXISTS "meetings update via parent" ON public.customer_meetings;
DROP POLICY IF EXISTS "meetings visible via parent" ON public.customer_meetings;

CREATE POLICY "meetings select scoped" ON public.customer_meetings FOR SELECT TO authenticated
  USING (public.can_access_customer(customer_id));
CREATE POLICY "meetings insert scoped" ON public.customer_meetings FOR INSERT TO authenticated
  WITH CHECK (public.can_access_customer(customer_id));
CREATE POLICY "meetings update scoped" ON public.customer_meetings FOR UPDATE TO authenticated
  USING (public.can_access_customer(customer_id))
  WITH CHECK (public.can_access_customer(customer_id));
CREATE POLICY "meetings delete scoped" ON public.customer_meetings FOR DELETE TO authenticated
  USING (public.can_access_customer(customer_id));

-- ============ customer_timeline ============
DROP POLICY IF EXISTS "timeline insert via parent" ON public.customer_timeline;
DROP POLICY IF EXISTS "timeline visible via parent" ON public.customer_timeline;

CREATE POLICY "timeline select scoped" ON public.customer_timeline FOR SELECT TO authenticated
  USING (public.can_access_customer(customer_id));
CREATE POLICY "timeline insert scoped" ON public.customer_timeline FOR INSERT TO authenticated
  WITH CHECK (public.can_access_customer(customer_id));
CREATE POLICY "timeline admin write" ON public.customer_timeline FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- ============ cms_pages ============
DROP POLICY IF EXISTS "auth read all pages" ON public.cms_pages;
-- Keeps: "admin manage pages" (super admin ALL) and "public read published pages" (status='published')

-- ============ cms_page_versions ============
DROP POLICY IF EXISTS "auth read versions" ON public.cms_page_versions;
DROP POLICY IF EXISTS "anon read published version" ON public.cms_page_versions;
-- Keeps: "admin write versions" (super admin ALL) — super admin only

-- ============ asset_folders ============
DROP POLICY IF EXISTS "anon read folders" ON public.asset_folders;
DROP POLICY IF EXISTS "auth read folders" ON public.asset_folders;
-- Keeps: "admin write folders" (super admin ALL)

-- Revoke anon grant on tables that no longer have anon-accessible policies
REVOKE SELECT ON public.asset_folders FROM anon;
REVOKE SELECT ON public.cms_page_versions FROM anon;
