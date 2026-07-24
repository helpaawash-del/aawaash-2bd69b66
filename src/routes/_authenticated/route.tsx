import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * Aawash protected layout.
 * Any route under `/_authenticated/*` requires a live Supabase session.
 * Client-only gate (`ssr: false`) because sessions live in localStorage.
 */
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      // IMPORTANT: pass only the internal path (pathname + search), never a
      // full URL. TanStack `navigate({ to })` rejects absolute URLs and the
      // sign-in redirect silently fails, which produced the admin-login loop.
      const internalPath = `${location.pathname}${location.searchStr ?? ""}`;
      if (location.pathname === "/admin" || location.pathname.startsWith("/admin/")) {
        throw redirect({
          to: "/admin-login",
          search: { redirect: internalPath },
        });
      }
      throw redirect({
        to: "/auth",
        search: { redirect: internalPath },
      });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
