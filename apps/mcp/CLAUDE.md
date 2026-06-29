# @showtime/mcp

A local MCP server that exposes movie and TV data as tools, backed by `@showtime/core`. It speaks stdio (via `@modelcontextprotocol/sdk`) and is meant to run as a local MCP server, not deployed.

See the root `CLAUDE.md` for monorepo-wide toolchain and commands.

## Layout

- `src/index.ts` — entry point. Reads `OMDB_API_KEY` and `TMDB_API_KEY` from the environment (exits if missing), builds the core clients, registers every tool, and connects a `StdioServerTransport`.
- `src/tools/` — one file per tool, each a `defineTool({ name, title, description, schema, handler })` export.
  - `define-tool.ts` — the `defineTool` seam and the `registerTool` runner. The runner wraps every handler in one try/catch: a returned payload becomes a success response, a `paginatedResult(...)` becomes a paginated response, and a thrown error becomes an error response. Use `failWith(...)` to return an already-formatted error.
  - `index.ts` — imports every tool into one `toolDefinitions` array and registers them in a single loop. **Add a new tool here** after creating its file.
  - `helpers/` — `resolvers.ts` (e.g. title/id resolution, `requireAtLeastOne`) and `response.ts` (the MCP response shapers).

## Conventions

- Handlers are pure-ish: they take `(args, clients)` where `clients` is `{ tmdb, omdb }` injected by the runner, and return raw payload data. They never build MCP responses themselves and never instantiate clients — that is the runner's and `index.ts`'s job.
- Schemas are zod raw shapes; `defineTool` preserves per-tool type inference so `args` is typed inside each handler.
- Tools fall into three groups (kept labelled in `index.ts`): TMDB-powered, OMDB-only (TV series/episodes), and hybrid (e.g. `get_movie` merges OMDB ratings into TMDB data).
- All upstream data access goes through `@showtime/core`. Do not call TMDB/OMDB directly.

## Running

- `vp run start` — run once (`tsx`, loads `.env` if present).
- `vp run dev` — watch mode.
- `vp run typecheck` — `tsc --noEmit`.

Requires `OMDB_API_KEY` and `TMDB_API_KEY` in `.env` (see `.env.example`).

## Adding a tool

1. Create `src/tools/<name>.ts` exporting a `defineTool({...})`.
2. Import it and add it to `toolDefinitions` in `src/tools/index.ts`.
3. Return raw data, or `paginatedResult(apiResponse, data)` when the upstream response carries pagination metadata.
