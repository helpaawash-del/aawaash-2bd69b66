import { createFileRoute, Outlet } from "@tanstack/react-router";

/** Layout for every `/leader/*` page. Children render through the Outlet. */
export const Route = createFileRoute("/_authenticated/leader")({
  component: () => <Outlet />,
});
