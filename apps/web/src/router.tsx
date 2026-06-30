import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { routeTree } from "./routeTree.gen";
import { ErrorView } from "#/components/ui/ErrorView";
import { NotFound } from "#/components/ui/NotFound";

export const getRouter = () => {
  const queryClient = new QueryClient();
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

  // Wires TanStack Query into the router: dehydrates/hydrates the query cache
  // across SSR and injects a `QueryClientProvider` via the router's `Wrap`, so
  // components can `useQuery` without a hand-placed provider. A fresh client per
  // `getRouter()` call keeps server requests from sharing cache.
  setupRouterSsrQueryIntegration({ router, queryClient });

  return router;
};

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
