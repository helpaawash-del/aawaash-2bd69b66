import { Navigate } from "@tanstack/react-router";
import { useSession } from "@/hooks/useSession";
import type { AppRole } from "@/lib/auth";
import { AmbientBackground } from "./AmbientBackground";
import { BrandMark } from "./BrandMark";

/**
 * Client-side role gate for pages under `/_authenticated`.
 * The parent layout has already verified an active session; this component
 * enforces role-level authorization and shows a calm loading state.
 */
export function RoleGuard({
  allow,
  children,
}: {
  allow: AppRole[];
  children: React.ReactNode;
}) {
  const { loading, user, role } = useSession();

  if (loading) {
    return (
      <div className="relative min-h-screen">
        <AmbientBackground />
        <div className="grid min-h-screen place-items-center px-6">
          <div className="glass-card flex flex-col items-center gap-4 rounded-3xl px-8 py-10 shadow-[var(--shadow-float)]">
            <BrandMark size="md" showWordmark={false} />
            <p className="text-sm font-medium text-muted-foreground">
              Preparing your dashboard…
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" />;
  if (!role || !allow.includes(role)) {
    return <Navigate to="/unauthorized" />;
  }
  return <>{children}</>;
}
