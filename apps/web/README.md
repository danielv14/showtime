# web

The Showtime website: a [TanStack Start](https://tanstack.com/start) app (React 19, Tailwind v4) deployed to Cloudflare Workers. It renders movie and TV browsing and detail pages from data provided by [`@showtime/core`](../../packages/core/README.md).

## Running

```bash
vp dev                  # dev server on http://localhost:3000
vp build                # build for Cloudflare Workers
vp preview              # preview the production build
vp test                 # tests (Vitest + Testing Library, jsdom)
vp run generate-routes  # regenerate the route tree (tsr generate)
```

## Secrets

`TMDB_API_KEY` and `OMDB_API_KEY` are required at runtime. Locally they come from `.dev.vars`; in production set them with `wrangler secret put`. Both surface via `process.env` thanks to the `nodejs_compat` flag in `wrangler.jsonc`.

## Layout

- `src/routes/`: file-based routes (TanStack Router). `__root.tsx` is the shell; `index.tsx`, `search.tsx`, `movie.$slug.tsx`, `tv.$slug.tsx` are pages. `routeTree.gen.ts` is generated, do not edit it by hand.
- `src/server/`: server-only code.
  - `clients.ts`: `getTmdb()` / `getOmdb()`, which read secrets via `requireEnv` and build the core clients. Secrets never reach the client bundle.
  - `media.ts`: `createServerFn` functions that call the core clients and map upstream responses into the UI shapes (`MediaItem`, `MediaDetail`, ...) that components consume.
- `src/components/`: presentational React components (`MediaCard`, `MediaRow`, `DetailView`, `WhereToWatch`, ...).
- `src/lib/`: `seo.ts` (page meta) and `slug.ts` (detail-page slug helpers).
- `src/router.tsx`, `src/styles.css`: router setup and the Tailwind entrypoint.

## Routing

Detail pages use human-readable slugs with the TMDB id as the trailing segment, e.g. `/movie/the-matrix-603` and `/tv/breaking-bad-1396`. `src/lib/slug.ts` builds the slug (`toMediaSlug`) and parses the id back out (`parseMediaId`); the id is always the last `-<number>`, so bare-id URLs like `/movie/603` still resolve. The loader canonicalizes: visiting a stale or wrong slug redirects to the correct one.

Add a route by adding a file under `src/routes/`, then run `vp run generate-routes` if the route tree needs regenerating.

## Data flow

Route loader or component to a `createServerFn` in `src/server/media.ts` to a core client, mapped into a UI shape. Components receive already-shaped data; raw `Tmdb*` / `Omdb*` types stay behind the server layer, and nothing in the client reads API keys or calls the upstream APIs directly. Imports use the `#/*` alias for `./src/*`.
