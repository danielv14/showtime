# web

The Showtime website: a [TanStack Start](https://tanstack.com/start) app (React 19, Tailwind v4) deployed to Cloudflare Workers. It renders movie and TV browsing and detail pages from data provided by [`@showtime/core`](../../packages/core/README.md).

## Running

```bash
vp dev                  # dev server on http://localhost:3000
vp build                # build for Cloudflare Workers
vp preview              # preview the production build
vp test                 # tests (Vitest + Testing Library, jsdom)
vp run generate-routes  # regenerate the route tree (tsr generate)
vp run deploy           # build and deploy to Cloudflare (vp build && wrangler deploy)
```

## Secrets

`TMDB_API_KEY` and `OMDB_API_KEY` are required at runtime. Locally they come from `.dev.vars`; in production set them with `wrangler secret put`. Both surface via `process.env` thanks to the `nodejs_compat` flag in `wrangler.jsonc`.

## Layout

- `src/routes/`: file-based routes (TanStack Router). `__root.tsx` is the shell; `index.tsx` (home), `search.tsx`, `movies.tsx` + `shows.tsx` (browse/discover), `movie.$slug.tsx`, `tv.$slug.tsx`, and `person.$slug.tsx` (director & actor pages) are pages. `routeTree.gen.ts` is generated, do not edit it by hand.
- `src/server/`: server-only code.
  - `clients.ts`: `getTmdb()` / `getOmdb()`, which read secrets via `requireEnv` and build the core clients. Secrets never reach the client bundle.
  - `media.ts`: the `createServerFn` functions the routes call. Thin orchestration: each fetches via the core clients, wraps the work in `cached(...)`, and delegates all mapping to `shaper.ts`. Re-exports the UI shapes for components.
  - `shaper.ts`: pure shaping module that maps upstream `Tmdb*` / `Omdb*` responses into the UI shapes (`MediaItem`, `MediaDetail`, `PersonDetail`, ...) components consume. No fetching, caching, or secrets, so it is unit-testable in isolation.
  - `cache.ts`: `cached()`, a read-through cache over the `CACHE` KV namespace, plus `TTL` constants (see Caching below).
  - `browse.ts`: pure browse-filter module: parses URL search params into a canonical `BrowseFilters` object and maps it onto TMDB discover options.
- `src/components/`: presentational React components (`MediaCard`, `MediaRow`, `MediaGrid`, `DetailView`, `PersonView`, `BrowseView`, `Pagination`, `WhereToWatch`, `ErrorView`, ...).
- `src/lib/`: `seo.ts` (page meta) and `slug.ts` (detail-page slug helpers).
- `src/router.tsx`, `src/styles.css`: router setup and the Tailwind entrypoint.

## Routing

Detail pages use human-readable slugs with the TMDB id as the trailing segment, e.g. `/movie/the-matrix-603` and `/tv/breaking-bad-1396`. `src/lib/slug.ts` builds the slug (`toMediaSlug`) and parses the id back out (`parseMediaId`); the id is always the last `-<number>`, so bare-id URLs like `/movie/603` still resolve. The loader canonicalizes: visiting a stale or wrong slug redirects to the correct one.

Add a route by adding a file under `src/routes/`, then run `vp run generate-routes` if the route tree needs regenerating.

## Data flow

Route loader or component → a `createServerFn` in `src/server/media.ts` → `cached(...)` over the `CACHE` KV → a core client → `shaper.ts` maps the response into a UI shape. Components receive already-shaped data; raw `Tmdb*` / `Omdb*` types stay behind the server layer, and nothing in the client reads API keys or calls the upstream APIs directly. `media.ts` orchestrates and caches but holds no mapping logic itself. Imports use the `#/*` alias for `./src/*`.

## Caching

`src/server/cache.ts` exposes `cached(key, ttl, fetchFn)`, a read-through cache backed by the `CACHE` KV namespace (bound in `wrangler.jsonc`). On a hit the stored JSON is returned and `fetchFn` never runs; on a miss `fetchFn` runs and its result is stored under the given TTL. This is what keeps the app under OMDB's daily rate limit: each upstream payload is fetched once per key per TTL window regardless of page views. `TTL` exposes named windows (`hour`, `day`, `week`). A `fetchFn` can flag a degraded result (a sub-fetch failed) so it is cached under a short TTL instead of being frozen for the full window. If the binding is absent (e.g. a context without KV) `cached` degrades to calling `fetchFn` directly.

## Error handling

The router sets `defaultErrorComponent: ErrorView` and `defaultNotFoundComponent: NotFound` in `src/router.tsx`, so a throwing loader is caught at the failing route and rendered via `ErrorView` instead of blanking the whole page.
