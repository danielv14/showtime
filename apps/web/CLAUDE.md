# web

The Showtime website: a TanStack Start app (React 19, Tailwind v4) deployed to Cloudflare Workers. It renders movie/TV browsing and detail pages using data from `@showtime/core`.

See the root `CLAUDE.md` for monorepo-wide toolchain and commands.

## Layout

- `src/routes/` — file-based routes (TanStack Router). `__root.tsx` is the shell/layout; `index.tsx`, `search.tsx`, `movie.$slug.tsx`, `tv.$slug.tsx` are pages. Detail slugs are `title-id` (see `src/lib/slug.ts`); the trailing id is what TMDB is queried by. `routeTree.gen.ts` is generated — do not edit by hand.
- `src/server/` — server-only code.
  - `clients.ts` — `getTmdb()` / `getOmdb()`, which read secrets via `requireEnv` and build the core clients. Server-only; secrets are never bundled into the client.
  - `media.ts` — `createServerFn` server functions that call the core clients and map upstream responses into the UI-facing shapes (`MediaItem`, `PersonItem`, etc.) that components consume.
- `src/components/` — presentational React components (`MediaCard`, `MediaRow`, `DetailView`, `WhereToWatch`, ...).
- `src/router.tsx`, `src/styles.css` — router setup and the Tailwind entrypoint.

## Conventions

- Data flow: route `loader` / component → `createServerFn` in `src/server/media.ts` → core client → mapped to a UI shape. Components receive already-shaped data; keep raw `Tmdb*`/`Omdb*` types behind the server layer.
- All TMDB/OMDB access goes through `@showtime/core`. Components and routes never call the APIs or read API keys directly.
- Imports use the `#/*` alias for `./src/*`.
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
