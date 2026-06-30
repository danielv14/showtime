// @vitest-environment jsdom
import { describe, it, expect } from "vite-plus/test";
import { render, screen, waitFor } from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { ErrorView } from "./ErrorView.js";

/**
 * Exercises the wiring we actually ship: a route loader that throws should be
 * caught by `defaultErrorComponent` (ErrorView) rather than crashing the app.
 */
const renderWithThrowingRoute = () => {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    loader: () => {
      throw new Error("upstream boom");
    },
    component: () => <div>should not render</div>,
  });

  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute]),
    defaultErrorComponent: ErrorView,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });

  render(<RouterProvider router={router} />);
};

describe("ErrorView", () => {
  it("renders the error boundary when a route loader throws", async () => {
    renderWithThrowingRoute();

    await waitFor(() => {
      expect(screen.getByText("We hit a snag")).toBeDefined();
    });
    expect(screen.getByRole("button", { name: "Try again" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Back to home" })).toBeDefined();
    expect(screen.queryByText("should not render")).toBeNull();
  });
});
