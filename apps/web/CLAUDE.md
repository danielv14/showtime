# web

The Showtime website: a TanStack Start app (React 19, Tailwind v4) deployed to Cloudflare Workers. It renders movie/TV browsing and detail pages using data from `@showtime/core`.

See the root `CLAUDE.md` for monorepo-wide toolchain and commands.

## Layout

- `src/routes/` — file-based routes (TanStack Router). `__root.tsx` is the shell/layout; `index.tsx` (home), `search.tsx`, `movies.tsx` + `shows.tsx` (browse/discover surfaces), `movie.$slug.tsx`, `tv.$slug.tsx`, and `person.$slug.tsx` (director & actor pages) are pages. Detail slugs are `title-id` (see `src/lib/slug.ts`); the trailing id is what TMDB is queried by. `routeTree.gen.ts` is generated — do not edit by hand.
- `src/server/` — server-only code.
  - `clients.ts` — `getTmdb()` / `getOmdb()`, which read secrets via `requireEnv` and build the core clients. Server-only; secrets are never bundled into the client.
  - `media.ts` — the `createServerFn` server functions the routes call. Thin orchestration: each fetches via the core clients, wraps the work in `cached(...)`, and delegates all upstream→UI mapping to `shaper.ts`. Re-exports the UI shapes so components import them from here.
  - `shaper.ts` — pure shaping module. Maps core's `Tmdb*`/`Omdb*` responses into the UI-facing shapes (`MediaItem`, `PersonItem`, `MediaDetail`, `PersonDetail`, etc.) that components consume. Never fetches, caches, or reads secrets, so it stays unit-testable without a network or KV.
  - `cache.ts` — `cached()`, a read-through cache over the `CACHE` KV namespace, plus `TTL` constants. Keeps the app under OMDB's daily rate limit; a degraded payload (a failed sub-fetch) gets a short TTL so partial data is not frozen for the full window.
  - `browse.ts` — pure browse-filter module: parses/normalises URL search params into a canonical `BrowseFilters` object and maps it onto TMDB discover options. The single source of truth for what a browse URL means.
- `src/components/` — presentational React components, grouped by feature/domain into subfolders: `layout/` (shell: Header, Footer), `media/` (shared cards/grids: MediaCard, MediaGrid, MediaRow, PersonCard), `detail/` (movie/TV detail page: DetailView, DetailHero, CastList, Reviews, WhereToWatch, TrailerPlayer, EpisodeRatings, plus a `season-episodes/` subfolder), `person/`, `collection/`, `browse/`, `search/`, and `ui/` (generic primitives: Select, Pagination, ErrorView, NotFound). Tests are co-located (`*.test.tsx`) beside the component they cover.
- `src/lib/` — pure, framework-agnostic helpers, each with a co-located `*.test.ts`: `slug.ts` (URL slugs), `seo.ts`, `date.ts` (date/lifespan formatting), `youtube.ts` (trailer URL parsing), `ratings.ts` (episode heatmap colours), `year-options.ts` (filter year dropdowns).
- `src/router.tsx`, `src/styles.css` — router setup and the Tailwind entrypoint. The router wires app-wide boundaries via `defaultErrorComponent: ErrorView` and `defaultNotFoundComponent: NotFound`, so a throwing loader is caught at the failing route. Fonts (Inter for body, Space Grotesk for headings) load from Google Fonts in `__root.tsx` and bind to `--font-sans` / `--font-display` in `styles.css`.

## Conventions

- Data flow: route `loader` / component → `createServerFn` in `src/server/media.ts` → `cached(...)` over the `CACHE` KV → core client → `shaper.ts` maps the response into a UI shape. Components receive already-shaped data; keep raw `Tmdb*`/`Omdb*` types behind the server layer. `media.ts` orchestrates and caches; it holds no mapping logic itself.
- All TMDB/OMDB access goes through `@showtime/core`. Components and routes never call the APIs or read API keys directly.
- Imports use the `#/*` alias for `./src/*` (wired via `tsconfig.json` paths, `vite.config.ts` `tsconfigPaths`, and `package.json` `imports`), e.g. `#/server/media`, `#/lib/slug`, `#/components/media/MediaCard`. Same-folder siblings stay relative (`./Foo`).
- TanStack Router file-based routing: add a route by adding a file under `src/routes/`. Run `vp run generate-routes` (`tsr generate`) if the route tree needs regenerating.

## Secrets

`TMDB_API_KEY` and `OMDB_API_KEY` are required at runtime. Locally they come from `.dev.vars`; in production they are set in the Cloudflare dashboard (Workers → the Worker → Settings → Variables & Secrets) or via `wrangler secret put`. They are intentionally not in `wrangler.jsonc`. Both surface via `process.env` thanks to the `nodejs_compat` flag in `wrangler.jsonc`.

## Commands

- `vp dev` (or `vp run dev`, port 3000) — dev server.
- `vp build` — build for Cloudflare Workers.
- `vp preview` — preview the production build.
- `vp test` — run tests (Vitest + Testing Library, jsdom).
- `vp run deploy` — build and deploy to Cloudflare (`vp build && wrangler deploy`).

## Deployment (Cloudflare Workers)

Continuous deployment via Cloudflare Workers Builds (Git integration on `danielv14/showtime`, `master`): a push to `master` builds and deploys. Workers Builds settings:

- **Root directory**: repo root.
- **Build command**: `cd apps/web && ./node_modules/.bin/vp build` (the toolchain is Vite+; there is no standalone `vite` binary).
- **Deploy command**: `cd apps/web && ./node_modules/.bin/wrangler deploy` — run the binary directly, not via `npx`, which invokes npm and fails `EBADDEVENGINES` (the root `package.json` pins pnpm via `devEngines`). `wrangler deploy` auto-detects the Vite `dist/` build; the `CACHE` KV binding and `nodejs_compat` come from `wrangler.jsonc`.
- **Secrets**: `TMDB_API_KEY` + `OMDB_API_KEY` on the Worker (see Secrets above).

Node is pinned via `.node-version` (`22.18.0`) because vite-plus's native bindings need `node ^20.19 || ^22.18 || >=24.11`, and pnpm silently skips optional deps whose engine doesn't match. Bump it if Cloudflare lacks that exact version.
