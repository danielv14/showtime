# Showtime

A monorepo for browsing movie and TV data from [TMDB](https://www.themoviedb.org) and [OMDB](https://www.omdbapi.com). Three deployables share a single data layer, so upstream API access lives in exactly one place.

## Workspaces

| Package         | Name             | What it is                                                                                                                         |
| --------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core` | `@showtime/core` | Shared data layer: TMDB + OMDB API clients, response types, and pure formatters. The only code that talks to the upstream APIs.    |
| `apps/mcp`      | `@showtime/mcp`  | Local stdio [MCP](https://modelcontextprotocol.io) server that exposes the data as 24 tools. Runs on Node via `tsx`; not deployed. |
| `apps/web`      | `web`            | [TanStack Start](https://tanstack.com/start) site (React 19, Tailwind v4) deployed to Cloudflare Workers.                          |

`apps/mcp` and `apps/web` depend on `@showtime/core` via `workspace:*` and never call TMDB or OMDB directly.

```
showtime/
├── packages/core   @showtime/core : clients, types, formatters
├── apps/mcp        @showtime/mcp  : stdio MCP server
└── apps/web        web            : TanStack Start, Cloudflare Workers
```

Each workspace has its own `CLAUDE.md` with the details:
[core](packages/core/CLAUDE.md), [mcp](apps/mcp/CLAUDE.md), [web](apps/web/CLAUDE.md).

## Toolchain

This repo uses [Vite+](https://viteplus.dev), a unified toolchain exposed through the global `vp` CLI (it wraps Vite, Rolldown, Vitest, tsdown, Oxlint, and Oxfmt). pnpm workspaces manage the packages; shared dependency versions live in the `catalog:` in `pnpm-workspace.yaml`.

- Node `>=22.18.0`
- pnpm `11.9.0` (downloaded automatically via `devEngines` if missing)
- The `vp` CLI. Run `vp help` for commands, or read the docs at `node_modules/vite-plus/docs`.

## Getting started

```bash
vp install
```

Both apps need a TMDB and an OMDB API key at runtime:

- **`apps/mcp`**: copy `apps/mcp/.env.example` to `apps/mcp/.env` and fill in `TMDB_API_KEY` and `OMDB_API_KEY`.
- **`apps/web`**: put the same keys in `apps/web/.dev.vars` locally; in production set them with `wrangler secret put`.

## Common commands

Run from the repo root.

| Command           | Does                                                                                     |
| ----------------- | ---------------------------------------------------------------------------------------- |
| `vp run ready`    | `vp check` + tests + build across every workspace. Run before considering a change done. |
| `vp run dev`      | Start the web dev server (port 3000).                                                    |
| `vp check`        | Format, lint, and typecheck.                                                             |
| `vp run fix`      | Apply formatting and lint fixes.                                                         |
| `vp run -r test`  | Run tests in every workspace.                                                            |
| `vp run -r build` | Build every workspace.                                                                   |

Per-workspace scripts run with `vp run <script>` from inside the workspace (or `vp run <name>#<script>` from the root), for example:

- `apps/mcp`: `vp run start` (run once), `vp run dev` (watch), `vp run typecheck`.
- `apps/web`: `vp dev`, `vp build`, `vp preview`, `vp run generate-routes`.

## Continuous integration

`.github/workflows/ci.yml` runs the checks on every push and pull request to `master`. It installs with `pnpm install --frozen-lockfile`, generates the Cloudflare Worker types the web typecheck needs (`wrangler types`, since `worker-configuration.d.ts` is gitignored), then runs `pnpm check` (format, lint, typecheck) and `pnpm test`. Deployment is separate: a push to `master` also triggers a Cloudflare Workers Build that deploys `apps/web` (see [apps/web/CLAUDE.md](apps/web/CLAUDE.md)).

## MCP server

`apps/mcp` is a stdio server, so it is launched by an MCP client rather than run standalone. To register it with Claude Code:

```bash
claude mcp add showtime-mcp -- \
  ./apps/mcp/node_modules/.bin/tsx \
  --env-file-if-exists=$PWD/apps/mcp/.env \
  $PWD/apps/mcp/src/index.ts
```

## Conventions

- TypeScript ESM throughout. Relative imports inside a package use `.js` extensions even for `.ts` files.
- All TMDB/OMDB access goes through `@showtime/core`; nothing else reads API keys or calls the upstream APIs.
