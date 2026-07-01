import { createFileRoute, redirect } from "@tanstack/react-router";

// Root redirects into the app; the authenticated layout gate handles the rest.
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/home" });
  },
});
