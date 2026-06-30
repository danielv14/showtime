import type { OmdbClient, TmdbClient } from "@showtime/core";
import type { ToolClients } from "../define-tool.js";

/**
 * Build a {@link ToolClients} pair for handler tests from partial fakes. Only
 * the methods a handler actually calls need to be provided; the rest throw if
 * touched, so an unexpected call surfaces as a test failure rather than
 * silently returning undefined. Self-contained: no network, no real client.
 */
export const createFakeClients = (
  overrides: { tmdb?: Partial<TmdbClient>; omdb?: Partial<OmdbClient> } = {},
): ToolClients => {
  const tmdbHandler: ProxyHandler<Record<string, unknown>> = {
    get(target, property: string) {
      if (property in target) {
        return target[property];
      }
      throw new Error(`Unexpected tmdb client call: ${property}`);
    },
  };

  const omdbHandler: ProxyHandler<Record<string, unknown>> = {
    get(target, property: string) {
      if (property in target) {
        return target[property];
      }
      throw new Error(`Unexpected omdb client call: ${property}`);
    },
  };

  const tmdb = new Proxy(
    (overrides.tmdb ?? {}) as Record<string, unknown>,
    tmdbHandler,
  ) as unknown as TmdbClient;
  const omdb = new Proxy(
    (overrides.omdb ?? {}) as Record<string, unknown>,
    omdbHandler,
  ) as unknown as OmdbClient;

  return { tmdb, omdb };
};

/** A no-op `getImageUrl` that echoes a predictable url for any non-null path. */
export const fakeGetImageUrl = (path: string | null, size = "w342"): string | null =>
  path === null ? null : `https://image.test/${size}${path}`;
