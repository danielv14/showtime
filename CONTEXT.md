# Domain glossary

Names for the load-bearing concepts in this repo, so tools, tests, and reviews
use one vocabulary. Architecture terms (module, interface, seam, adapter) come
from the design vocabulary; the entries below name domain concepts.

## Media resolution (apps/mcp)

The MCP tools accept a movie or TV series by several identifiers (a TMDB id, an
IMDb id, or a title). Turning any of those into something the tool can act on is
handled by a small family of resolution seams in `apps/mcp/src/tools/helpers/resolvers.ts`,
so no tool hand-rolls its own identifier handling:

- **`resolveMedia`** — the media seam. Resolves `{ mediaType, tmdbId, imdbId, title }`
  into a uniform `ResolvedMedia` (`{ type, id, name }`). Owns the at-least-one-identifier
  guard and the rule that IMDb-id lookup is movie-only.
- **`resolveMovieOrTv`** — adapter over `resolveMedia` for tools whose schema exposes
  `movieId`/`tvId` as separate fields (e.g. `get_similar`, `get_reviews`, `get_videos`).
  Owns the guard phrased in those field names.
- **`resolveMovieAcrossSources`** — cross-source movie resolution. Resolves a movie to
  _both_ an `imdbId` and a `tmdbId`, crossing between TMDB and the caller's OMDB lookup
  (`get_movie` merges the two). Returns any TMDB details it fetched so the caller reuses
  rather than refetches. Establishing the OMDB-side id and validating the result's type
  stay with the caller.

## Pagination

Every paginated tool result is shaped by one module (`helpers/response.ts` +
`define-tool.ts`). Handlers hand a normalised `Pagination` (`{ page, totalPages,
totalResults }`) to the runner, which caps `totalPages` and names the output fields.
Each upstream is adapted into that shape: `paginatedResult` for TMDB's wire response,
`omdbPaginatedResult` for OMDB's per-page count. No tool computes pagination fields
by hand.

## Result rows

The shape of a movie / TV row in a tool's output is defined once in `@showtime/core`
(`formatTmdbMovieResult`, `formatTmdbTvResult`) and reused by the tools that list media
(search, discover, `get_collection`, ...), so the row does not drift between them.
