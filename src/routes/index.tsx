import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AmbientBackground } from "@/components/aawash/AmbientBackground";
import { BrandMark } from "@/components/aawash/BrandMark";
import { useSession } from "@/hooks/useSession";
import { homePathForRole } from "@/lib/auth";

export const Route = createFileRoute("/")({
  component: SplashGate,
});

/**
 * Aawash entry splash.
 *
 * Every visit resolves to exactly one of two destinations:
 *  - authenticated → the user's role home
 *  - unauthenticated → /auth
 *
 * No landing page, no CTAs. Auth is invite-only; there is nothing to sell to
 * anonymous visitors.
 */
function SplashGate() {
  const navigate = useNavigate();
  const { loading, user, role } = useSession();

  useEffect(() => {
    if (loading) return;
    if (user) {
      navigate({ to: homePathForRole(role), replace: true });
    } else {
      navigate({ to: "/auth", replace: true });
    }
  }, [loading, user, role, navigate]);

  return (
    <div className="relative min-h-screen">
      <AmbientBackground />
      <div className="grid min-h-screen place-items-center px-6">
        <div className="flex flex-col items-center gap-6">
          <div className="animate-float-slow">
            <BrandMark size="lg" />
          </div>
          <div className="flex items-center gap-3">
            <span className="relative flex h-2 w-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-primary/60" />
              <span className="relative inline-block h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Preparing your space
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
