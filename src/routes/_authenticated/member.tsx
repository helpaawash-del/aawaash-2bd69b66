import { createFileRoute, Outlet } from "@tanstack/react-router";

/** Layout for every `/member/*` page. Children render through the Outlet. */
export const Route = createFileRoute("/_authenticated/member")({
  component: () => <Outlet />,
});
