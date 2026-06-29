# @showtime/core

The shared data layer for the monorepo. Owns all access to the two upstream APIs — TMDB (themoviedb.org) and OMDB (omdbapi.com) — plus the shared types and formatters. `@showtime/mcp` and `web` consume this package and must never call TMDB or OMDB themselves.

See the root `CLAUDE.md` for monorepo-wide toolchain and commands.

## Layout

- `src/tmdb/` — `createTmdbClient(apiKey)` (ky-based), the `TmdbClient` type, and all `Tmdb*` response types. The primary data source: search, discover, details, credits, watch providers, trending, videos, reviews, collections.
- `src/omdb/` — `createOmdbClient(apiKey)`, the `OmdbClient` type, and `Omdb*` types. Used mainly for TV series, season/episode data, and IMDb/Rotten Tomatoes ratings.
- `src/helpers/` — `constants.ts` (genre maps, pagination caps, the `NA` placeholder) and `formatters.ts` (pure shaping functions like `extractYear`, `truncateText`, `formatTmdbMovieResult`).
- `src/index.ts` — barrel re-exporting everything. Subpath exports `./tmdb` and `./omdb` are also defined in `package.json`.

## Conventions

- Clients are factory functions that take an API key and return an object of methods; they hold no global state. API keys are passed in by the consumer, never read from `process.env` here.
- Errors throw `TmdbApiError` / `OmdbApiError`. Let consumers decide how to surface them.
- Formatters are pure and synchronous — no fetching, no env, no MCP/UI concerns. Image URLs are built by passing a `getImageUrl` callback in, so this package stays unaware of how consumers render.
- Internal imports use `.js` extensions (ESM).

## Testing

`vp test` (or `vp run -r test` from the root). Tests live in `src/**/__tests__/`. Pure helpers exported only for tests (e.g. `buildSearchParams`, `mediaPath` in `tmdb/client.ts`) are marked as such in their doc comments.
