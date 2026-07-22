import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy path — DAM has moved to /admin/media
export const Route = createFileRoute("/_authenticated/admin/cms/media")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/media" });
  },
});
