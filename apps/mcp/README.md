# @showtime/mcp

A local [MCP](https://modelcontextprotocol.io) server that exposes movie and TV data as tools, backed by [`@showtime/core`](../../packages/core/README.md). It speaks stdio (via `@modelcontextprotocol/sdk`) and runs on Node through `tsx`. It is meant to be launched by an MCP client, not deployed.

## Requirements

`OMDB_API_KEY` and `TMDB_API_KEY` are read from the environment at startup; the server exits if either is missing. Copy `.env.example` to `.env` and fill them in:

```bash
cp .env.example .env
```

## Running

```bash
vp run start      # run once (tsx, loads .env if present)
vp run dev        # watch mode
vp run typecheck  # tsc --noEmit
```

Because it is a stdio server, running `start` directly just waits for a client on stdin. In normal use an MCP client spawns it. To register it with Claude Code:

```bash
claude mcp add showtime-mcp -- \
  ./node_modules/.bin/tsx \
  --env-file-if-exists=$PWD/.env \
  $PWD/src/index.ts
```

## Tools

The server registers 24 tools, in three groups:

- **TMDB-powered**: search, discover, trending, details, credits, recommendations, similar, collections, videos, reviews, now playing, upcoming, airing today, watch providers, people.
- **OMDB-only**: TV series and season/episode lookups.
- **Hybrid**: e.g. `get_movie`, which merges OMDB ratings into TMDB data.

## Layout

- `src/index.ts`: entry point. Reads the API keys, builds the core clients, registers every tool, and connects a `StdioServerTransport`.
- `src/tools/`: one file per tool, each exporting a `defineTool({ name, title, description, schema, handler })`.
  - `define-tool.ts`: the `defineTool` seam and the `registerTool` runner. The runner injects `{ tmdb, omdb }` into every handler and wraps it in one try/catch: a returned payload becomes a success response, `paginatedResult(...)` becomes a paginated response, and a thrown error becomes an error response (use `failWith(...)` for an already-formatted error).
  - `index.ts`: imports every tool into one `toolDefinitions` array and registers them in a single loop.
  - `helpers/`: `resolvers.ts` (title/id resolution, `requireAtLeastOne`) and `response.ts` (the MCP response shapers).

## Adding a tool

1. Create `src/tools/<name>.ts` exporting a `defineTool({...})`. Return raw data, or `paginatedResult(apiResponse, data)` when the upstream response carries pagination metadata.
2. Import it and add it to `toolDefinitions` in `src/tools/index.ts`.

Handlers take `(args, clients)` and return raw payload data; they never build MCP responses or instantiate clients themselves. All upstream access goes through `@showtime/core`.
