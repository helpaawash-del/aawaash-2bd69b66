import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { AmbientBackground } from "@/components/aawash/AmbientBackground";
import { BrandMark } from "@/components/aawash/BrandMark";

export const Route = createFileRoute("/unauthorized")({
  component: Unauthorized,
  head: () => ({ meta: [{ title: "Access denied — Aawash" }] }),
});

function Unauthorized() {
  return (
    <div className="relative min-h-screen">
      <AmbientBackground />
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-6 text-center">
        <BrandMark size="md" showWordmark={false} />
        <div className="mt-8 grid h-16 w-16 place-items-center rounded-3xl bg-destructive/10 text-destructive">
          <ShieldAlert size={28} />
        </div>
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-foreground">
          Access denied
        </h1>
        <p className="mt-3 max-w-sm text-sm text-muted-foreground">
          You don't have permission to view this page. If you believe this is a
          mistake, contact your administrator.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-all hover:-translate-y-0.5"
        >
          Return home
        </Link>
      </div>
    </div>
  );
}
