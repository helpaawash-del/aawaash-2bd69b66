import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useSession } from "@/hooks/useSession";
import { homePathForRole } from "@/lib/auth";
import { AmbientBackground } from "@/components/aawash/AmbientBackground";
import { Loader2 } from "lucide-react";

/**
 * Neutral landing under the auth gate. Redirects to the correct role home
 * as soon as we know the user's role. Direct visits (e.g. from a stale
 * bookmark) also land here safely.
 */
export const Route = createFileRoute("/_authenticated/dashboard")({
  component: RoleRouter,
});

function RoleRouter() {
  const { loading, role, user } = useSession();
  if (loading) {
    return (
      <div className="relative min-h-screen">
        <AmbientBackground />
        <div className="grid min-h-screen place-items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" />;
  return <Navigate to={homePathForRole(role)} replace />;
}
