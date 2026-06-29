# @showtime/core

The shared data layer for the [Showtime](../../README.md) monorepo. It owns all access to the two upstream APIs, [TMDB](https://www.themoviedb.org) and [OMDB](https://www.omdbapi.com), and exposes the clients, response types, and pure formatters that the apps build on. `@showtime/mcp` and `web` consume this package and never call TMDB or OMDB themselves.

## Usage

It is a private workspace package, referenced as `"@showtime/core": "workspace:*"`.

```ts
import { createTmdbClient, createOmdbClient, extractYear } from "@showtime/core";

const tmdb = createTmdbClient(process.env.TMDB_API_KEY!);
const omdb = createOmdbClient(process.env.OMDB_API_KEY!);

const { results } = await tmdb.searchMovies("the matrix");
const first = results[0];
console.log(first.title, extractYear(first.release_date));

const ratings = await omdb.getById({ imdbId: "tt0133093" });
```

Subpath exports are available if you only need one provider:

```ts
import { createTmdbClient } from "@showtime/core/tmdb";
import { createOmdbClient } from "@showtime/core/omdb";
```

## Layout

- `src/tmdb/`: `createTmdbClient(apiKey)` (ky-based), the `TmdbClient` type, and all `Tmdb*` response types. The primary data source: search, discover, details, credits, watch providers, trending, videos, reviews, collections.
- `src/omdb/`: `createOmdbClient(apiKey)`, the `OmdbClient` type, and `Omdb*` types. Used mainly for TV series, season/episode data, and IMDb/Rotten Tomatoes ratings.
- `src/helpers/`: `constants.ts` (genre maps, pagination caps, the `NA` placeholder), `formatters.ts` (pure shaping functions like `extractYear`, `truncateText`, `formatTmdbMovieResult`), and `http.ts` (the injectable `HttpClient` seam shared by both clients: `createHttpClient`, the shared retry/timeout policy, and the transport-neutral `HttpRequestError`). `http.ts` is internal and not re-exported from the barrel.
- `src/index.ts`: barrel re-exporting everything (tmdb, omdb, constants, formatters).

## Design

- Clients are factory functions that take an API key, plus an optional `httpClient` that defaults to a real ky-based adapter, and return an object of methods. They hold no global state and never read `process.env`; the consumer passes the key in. The optional `httpClient` is the testability seam: a test can inject a fake that returns canned responses, exercising every method without the network.
- Requests that fail throw `TmdbApiError` / `OmdbApiError`. Internally the clients catch the transport-neutral `HttpRequestError` from the HTTP seam and map it into these domain errors, so ky's error types never leak out. Consumers decide how to surface them.
- Formatters are pure and synchronous: no fetching, no env, no MCP or UI concerns. Image URLs are built by passing a `getImageUrl` callback in, so the package stays unaware of how consumers render; the underlying `buildTmdbImageUrl` is also exported for callers that need a URL outside a formatter.
- ESM throughout; internal imports use `.js` extensions even for `.ts` files.

## Testing

```bash
vp test
```

Tests live in `src/**/__tests__/`. Client tests construct a client with a fake `HttpClient` (see `http.ts`) that returns canned wire responses, so every method runs without a real request. A few internal helpers (e.g. `buildSearchParams`, `mediaPath` in `tmdb/client.ts`) are exported only for tests and marked as such in their doc comments.
