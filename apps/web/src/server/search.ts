import {
  capTotalPages,
  TMDB_MAX_PAGES,
  type TmdbClient,
  type TmdbSearchResponse,
} from "@showtime/core";
import { fromMovie, fromMulti, fromPerson, fromTv, type SearchItem } from "./shaper";
import { normalizePage, normalizeYear, YEAR_FLOOR } from "./url-params";

/**
 * The search module: the single source of truth for "what does this search URL
 * mean" and how a resolved filter set dispatches to TMDB.
 *
 * Two responsibilities, both testable without the network:
 *   1. `normalizeSearchFilters` / `toSearchSearch` — pure parsing of raw URL
 *      params into a canonical `SearchFilters` and back into a compact URL shape.
 *   2. `runSearch` — type dispatch onto the upstream search endpoints, mapping
 *      each response into the UI's `SearchItem` shapes. It receives the TMDB
 *      client as an argument (dependency injection) rather than building one, so
 *      it never reads secrets and a fake client can drive it in tests.
 *
 * Kept free of `createServerFn`, `getTmdb()`, and `cached()` so the bulk of the
 * search coverage lives here. The `searchMedia` server function in `./media`
 * wires this to the real client and the cache.
 */

/** The four scopes the type filter exposes. "all" is today's blended multi-search. */
export type SearchType = "all" | "movie" | "tv" | "person";

export const SEARCH_TYPES: readonly SearchType[] = ["all", "movie", "tv", "person"];

const DEFAULT_TYPE: SearchType = "all";

/** Canonical, fully-resolved filter state for a search view. */
export interface SearchFilters {
  /** The raw query, trimmed but with the caller's casing preserved for display. */
  query: string;
  type: SearchType;
  /** Release / first-air year, or null. Only meaningful for the movie and TV types. */
  year: number | null;
  page: number;
}

/**
 * Compact, URL-facing shape: only non-default fields are present so a plain
 * search stays at `/search?q=...` rather than carrying redundant params. This is
 * what `validateSearch` returns and what `Link`s target.
 */
export interface SearchSearch {
  q?: string;
  type?: SearchType;
  year?: number;
  page?: number;
}

/** TMDB caps pagination at 500 pages, so normalisation never asks for a page upstream refuses. */
export const MAX_SEARCH_PAGE = TMDB_MAX_PAGES;

/** Earliest year offered in the search year control (older links still resolve via the normaliser's floor). */
export const SEARCH_YEAR_FLOOR = YEAR_FLOOR;

/**
 * Cap the query length so it cannot blow the KV cache-key size limit (512 bytes)
 * via `searchCacheKey`; a write past that limit throws and is silently swallowed,
 * so every such request bypasses the cache. No real search query is this long.
 */
const MAX_QUERY_LENGTH = 200;

const normalizeQuery = (value: unknown): string =>
  typeof value === "string" ? value.trim().slice(0, MAX_QUERY_LENGTH) : "";

const normalizeType = (value: unknown): SearchType =>
  SEARCH_TYPES.includes(value as SearchType) ? (value as SearchType) : DEFAULT_TYPE;

/**
 * Resolve any raw search record (typed search, hand-edited URL, stale link) into
 * a complete `SearchFilters`. An unknown type falls back to "all"; a year is
 * dropped when it is out of range, non-numeric, or paired with a type that does
 * not accept one (all/person); a bad page coerces to 1 — so an invalid URL
 * always resolves to a sane view rather than throwing.
 *
 * `currentYear` is injected for testability; production callers use the default.
 */
export const normalizeSearchFilters = (
  search: Record<string, unknown>,
  currentYear: number = new Date().getFullYear(),
): SearchFilters => {
  const type = normalizeType(search.type);
  // The year filter only applies to the per-type movie and TV searches; ignore
  // it for the blended "all" search and for people (those endpoints have no year).
  const yearApplies = type === "movie" || type === "tv";
  return {
    query: normalizeQuery(search.q),
    type,
    year: yearApplies ? normalizeYear(search.year, currentYear) : null,
    page: normalizePage(search.page, MAX_SEARCH_PAGE),
  };
};

/**
 * Strip default-valued fields so the URL only carries what the viewer actually
 * set. This is what `validateSearch` returns, keeping shareable links minimal.
 */
export const toSearchSearch = (filters: SearchFilters): SearchSearch => {
  const search: SearchSearch = {};
  if (filters.query) search.q = filters.query;
  if (filters.type !== DEFAULT_TYPE) search.type = filters.type;
  if (filters.year !== null) search.year = filters.year;
  if (filters.page !== 1) search.page = filters.page;
  return search;
};

/**
 * Stable cache-key fragment for a filter combination. The query is lowercased so
 * casing variants share a cache entry; the echoed display query (which keeps the
 * caller's casing) is handled by the server function, not here.
 */
export const searchCacheKey = (filters: SearchFilters): string =>
  `q${filters.query.toLowerCase()}:t${filters.type}:y${filters.year ?? ""}:p${filters.page}`;

// ----- type dispatch ----------------------------------------------------------

/** The slice of the TMDB client `runSearch` needs; lets tests inject a fake. */
export type SearchClient = Pick<
  TmdbClient,
  "multiSearch" | "searchMovies" | "searchTv" | "searchPerson"
>;

/** A page of search results plus the pagination envelope the UI consumes. */
export interface SearchPage {
  results: SearchItem[];
  page: number;
  totalPages: number;
}

const envelope = <T>(response: TmdbSearchResponse<T>, results: SearchItem[]): SearchPage => ({
  results,
  page: response.page,
  // TMDB refuses pages beyond 500, so the reported ceiling is capped to match,
  // letting the pagination control disable "next" cleanly at the real last page.
  totalPages: capTotalPages(response.total_pages),
});

/**
 * Dispatch a resolved filter set onto the matching TMDB endpoint and shape the
 * response. "all" stays on the blended `multiSearch` (preserving today's mixed
 * relevance ranking in one request); the per-type endpoints are used only once
 * the viewer narrows. Year is forwarded only to the movie and TV searches.
 *
 * Short-circuits a blank query to an empty page without any upstream call.
 */
export const runSearch = async (
  client: SearchClient,
  filters: SearchFilters,
): Promise<SearchPage> => {
  const query = filters.query.trim();
  if (!query) return { results: [], page: 1, totalPages: 0 };

  const { type, year, page } = filters;
  switch (type) {
    case "movie": {
      const response = await client.searchMovies(query, { page, year: year ?? undefined });
      return envelope(response, response.results.map(fromMovie));
    }
    case "tv": {
      const response = await client.searchTv(query, { page, year: year ?? undefined });
      return envelope(response, response.results.map(fromTv));
    }
    case "person": {
      const response = await client.searchPerson(query, { page });
      return envelope(response, response.results.map(fromPerson));
    }
    default: {
      const response = await client.multiSearch(query, { page });
      const results = response.results
        .map(fromMulti)
        .filter((item): item is SearchItem => item !== null);
      return envelope(response, results);
    }
  }
};
