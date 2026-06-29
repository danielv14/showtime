# web

The Showtime website: a TanStack Start app (React 19, Tailwind v4) deployed to Cloudflare Workers. It renders movie/TV browsing and detail pages using data from `@showtime/core`.

See the root `CLAUDE.md` for monorepo-wide toolchain and commands.

## Layout

- `src/routes/` — file-based routes (TanStack Router). `__root.tsx` is the shell/layout; `index.tsx`, `search.tsx`, `movie.$id.tsx`, `tv.$id.tsx` are pages. `routeTree.gen.ts` is generated — do not edit by hand.
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

`TMDB_API_KEY` and `OMDB_API_KEY` are required at runtime. Locally they come from `.dev.vars`; in production from `wrangler secret put`. Both surface via `process.env` thanks to the `nodejs_compat` flag in `wrangler.jsonc`.

## Commands

- `vp dev` (or `vp run dev`, port 3000) — dev server.
- `vp build` — build for Cloudflare Workers.
- `vp preview` — preview the production build.
- `vp test` — run tests (Vitest + Testing Library, jsdom).
