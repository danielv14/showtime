import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { ErrorView } from "./components/ErrorView";
import { NotFound } from "./components/NotFound";

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    defaultNotFoundComponent: NotFound,
    // Route-level error boundary applied to every route. A loader/render error
    // is caught at the failing route and shown via ErrorView, leaving the rest
    // of the shell intact.
    defaultErrorComponent: ErrorView,
  });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
