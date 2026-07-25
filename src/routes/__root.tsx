import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { BottomNav, BottomNavSkeleton, PublicBottomNav } from "@/components/aawash/BottomNav";
import { useSession } from "@/hooks/useSession";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#2E7D5B" },
      { name: "apple-mobile-web-app-title", content: "Aawaash" },
      { name: "application-name", content: "Aawaash" },
      { title: "Aawaash — Premium Real Estate, Reimagined" },
      {
        name: "description",
        content:
          "Aawaash is a luxury real estate ecosystem — curated residential projects, transparent commissions, and a mobile-first dashboard for your entire team.",
      },
      { property: "og:site_name", content: "Aawaash" },
      { property: "og:title", content: "Aawaash — Premium Real Estate, Reimagined" },
      {
        property: "og:description",
        content:
          "Aawaash is a luxury real estate ecosystem — curated residential projects, transparent commissions, and a mobile-first dashboard for your entire team.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://aawaash.lovable.app/__l5e/assets-v1/2e2ee34c-9ded-47cc-bd04-a31b7312c5e1/aawaash-og.png" },
      { property: "og:image:width", content: "512" },
      { property: "og:image:height", content: "512" },
      { property: "og:image:alt", content: "Aawaash logo" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Aawaash — Premium Real Estate, Reimagined" },
      { name: "twitter:description", content: "Aawaash is a luxury real estate ecosystem — curated residential projects, transparent commissions, and a mobile-first dashboard for your entire team." },
      { name: "twitter:image", content: "https://aawaash.lovable.app/__l5e/assets-v1/2e2ee34c-9ded-47cc-bd04-a31b7312c5e1/aawaash-og.png" },
      { name: "twitter:image:alt", content: "Aawaash logo" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "shortcut icon", href: "/favicon.png", type: "image/png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700;800&display=swap",
      },
    ],
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const { role, loading: sessionLoading } = useSession();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Project detail pages use their own contextual dock; sign-in surfaces show none.
  const hideGlobalDock =
    /^\/projects\/[^/]+$/.test(pathname) ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/admin-login") ||
    pathname.startsWith("/unauthorized");

  useEffect(() => {
    // Import inside effect to keep the browser client out of any SSR path.
    import("@/integrations/supabase/client").then(({ supabase }) => {
      const { data: sub } = supabase.auth.onAuthStateChange((event) => {
        if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
        router.invalidate();
        if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
      });
      return () => sub.subscription.unsubscribe();
    });
  }, [queryClient, router]);

  // Belt-and-suspenders: ensure #lovable-badge stays hidden even when
  // injected after hydration. CSS !important covers paint; this observer
  // strips late-added nodes so they cannot flash or steal focus.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hide = (el: Element) => {
      const node = el as HTMLElement;
      node.style.setProperty("display", "none", "important");
      node.style.setProperty("visibility", "hidden", "important");
      node.style.setProperty("opacity", "0", "important");
      node.style.setProperty("pointer-events", "none", "important");
      node.setAttribute("aria-hidden", "true");
    };
    document.querySelectorAll("#lovable-badge").forEach(hide);
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((n) => {
          if (!(n instanceof HTMLElement)) return;
          if (n.id === "lovable-badge") hide(n);
          n.querySelectorAll?.("#lovable-badge").forEach(hide);
        });
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      {hideGlobalDock
        ? null
        : sessionLoading
          ? <BottomNavSkeleton />
          : role ? <BottomNav role={role} /> : <PublicBottomNav />}
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
