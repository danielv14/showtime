import type { ReactNode } from "react";
import {
  createRootRoute,
  createRoute,
  createRouter,
  createMemoryHistory,
  RouterProvider,
} from "@tanstack/react-router";
import { render, screen, waitFor, type RenderResult } from "@testing-library/react";

/**
 * Render a component that uses router primitives (`Link`, etc.) inside a minimal
 * in-memory router. The component under test renders at `/`, with stub routes
 * registered for every path the components link to (`/movies`, `/shows`,
 * `/movie/$slug`, `/tv/$slug`) so `Link`s resolve to real `<a href>`s we can
 * assert on. Async because `RouterProvider` mounts its first match in an effect.
 */
export const renderWithRouter = async (ui: ReactNode): Promise<RenderResult> => {
  const rootRoute = createRootRoute();
  const stub = (path: string) =>
    createRoute({ getParentRoute: () => rootRoute, path, component: () => null });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => <div data-testid="router-content">{ui}</div>,
  });
  const routeTree = rootRoute.addChildren([
    indexRoute,
    stub("/movies"),
    stub("/shows"),
    stub("/movie/$slug"),
    stub("/tv/$slug"),
  ]);
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = render(<RouterProvider router={router as any} />);
  // `RouterProvider` mounts its first match in an effect, so wait until the
  // component under test is actually in the DOM before returning.
  await waitFor(() => screen.getByTestId("router-content"));
  return result;
};
