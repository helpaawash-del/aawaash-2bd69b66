import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Prefetch a route's code + data on hover/touch-start so clicking a link
    // feels instant. TanStack Query still owns data freshness.
    defaultPreload: "intent",
    defaultPreloadDelay: 40,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
