# Showtime

A monorepo for browsing movie and TV data from TMDB and OMDB. Three deployables share one data layer:

- `packages/core` (`@showtime/core`) — TMDB + OMDB API clients, types, and formatters. The single source of upstream data access.
- `apps/mcp` (`@showtime/mcp`) — local stdio MCP server that exposes the data as tools.
- `apps/web` (`web`) — TanStack Start site deployed to Cloudflare Workers.

`apps/mcp` and `apps/web` both depend on `@showtime/core` via `workspace:*` and never call TMDB or OMDB directly. Each workspace has its own `CLAUDE.md` with the details.

## Toolchain

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->

## Common commands

- `vp install` — install dependencies after pulling.
- `vp run ready` — `vp check` + tests + build across every workspace (the root `ready` script). Run before considering a change done.
- `vp run dev` — start the web dev server (proxies to `web#dev`).
- `vp check` — format, lint, and typecheck.
- `vp run -r test` — run tests in every workspace; `vp run -r build` builds every workspace.

## Conventions

- pnpm workspaces (`apps/*`, `packages/*`, `tools/*`). Shared dependency versions live in the `catalog:` in `pnpm-workspace.yaml`, referenced as `"catalog:"` in each `package.json`.
- TypeScript ESM throughout. Relative imports inside a package use `.js` extensions even for `.ts` files.
