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

Continuous deployment via Cloudflare Workers Builds (Git integration on `danielv14/showtime`, branch `master`): a push to `master` builds and deploys automatically. For a manual deploy use `vp run deploy`.

`wrangler deploy` auto-detects the Vite build in `dist/` and deploys it (no `-c` flag needed). The `CACHE` KV binding and the `nodejs_compat` flag come from `wrangler.jsonc`; only the two API-key secrets are set out-of-band (see Secrets above).

Workers Builds settings (the one non-obvious part is that CI has no global `vp`):

- **Root directory**: repo root, so the pnpm workspace and catalog resolve.
- **Build command** — bootstraps Vite+, installs, builds the web app:
  ```
  curl -fsSL https://vite.plus | bash && export PATH="$HOME/.vite-plus/bin:$PATH" && vp install && vp run web#build
  ```
  There is no standalone `vite` binary (the toolchain is Vite+), and `vp install` honors the `allowBuilds` approvals in the root `pnpm-workspace.yaml` (e.g. `workerd`) that a plain `pnpm install` would skip — so CI must use `vp`, not bare pnpm.
- **Deploy command** — call wrangler's binary directly. `npx` would invoke npm, which aborts with `EBADDEVENGINES` because the root `package.json` pins pnpm via `devEngines.packageManager`:
  ```
  cd apps/web && ./node_modules/.bin/wrangler deploy
  ```
