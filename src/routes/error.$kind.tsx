import { createFileRoute, Link } from "@tanstack/react-router";
import { WifiOff, RefreshCw, ServerCrash, TimerReset, ShieldAlert } from "lucide-react";
import { AmbientBackground } from "@/components/aawash/AmbientBackground";
import { BrandMark } from "@/components/aawash/BrandMark";

type Kind = "500" | "network" | "session";

const CONFIG: Record<Kind, { icon: typeof WifiOff; title: string; body: string }> = {
  "500": {
    icon: ServerCrash,
    title: "Something broke on our end",
    body: "Our team has been notified. Please try again in a moment.",
  },
  network: {
    icon: WifiOff,
    title: "You're offline",
    body: "Check your connection and try again — Aawash needs the network to sync.",
  },
  session: {
    icon: TimerReset,
    title: "Your session expired",
    body: "For your security we signed you out. Please sign in again to continue.",
  },
};

export const Route = createFileRoute("/error/$kind")({
  component: ErrorPage,
  head: () => ({ meta: [{ title: "Something went wrong — Aawash" }] }),
});

function ErrorPage() {
  const { kind } = Route.useParams();
  const cfg = CONFIG[(kind as Kind) in CONFIG ? (kind as Kind) : "500"];
  const Icon = cfg.icon;
  const isSession = kind === "session";

  return (
    <div className="relative min-h-screen">
      <AmbientBackground />
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-6 text-center">
        <BrandMark size="md" showWordmark={false} />
        <div className="mt-8 grid h-16 w-16 place-items-center rounded-3xl bg-primary-soft text-primary">
          <Icon size={28} />
        </div>
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-foreground">{cfg.title}</h1>
        <p className="mt-3 max-w-sm text-sm text-muted-foreground">{cfg.body}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)]"
          >
            <RefreshCw size={14} /> Try again
          </button>
          <Link
            to={isSession ? "/auth" : "/"}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-surface px-5 text-sm font-semibold text-foreground shadow-[var(--shadow-soft)]"
          >
            {isSession ? "Sign in" : "Return home"}
          </Link>
        </div>
        {kind === "403" && (
          <div className="mt-8 inline-flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldAlert size={14} /> Ask your Team Leader for access.
          </div>
        )}
      </div>
    </div>
  );
}
