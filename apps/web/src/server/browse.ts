import { TMDB_MAX_PAGES, type DiscoverMoviesOptions, type DiscoverTvOptions } from "@showtime/core";
import { normalizePage, normalizeYear, toFiniteNumber, YEAR_FLOOR } from "./url-params";

/**
 * Pure browse-filter module: the single source of truth for "what does this
 * browse URL mean". It parses/normalises raw URL search params into a canonical
 * `BrowseFilters` object and maps that object onto TMDB's discover option bags.
 *
 * Kept free of fetching, caching, secrets, and `createServerFn` so it stays
 * unit-testable in isolation (this is where the bulk of the browse coverage
 * lives). The server functions in `./media` import these helpers.
 */

/** The three sort orders the UI exposes, decoupled from TMDB's sort_by strings. */
export type BrowseSort = "popularity" | "newest" | "rating";

export const BROWSE_SORTS: readonly BrowseSort[] = ["popularity", "newest", "rating"];

const DEFAULT_SORT: BrowseSort = "popularity";

/** A selectable genre in the filter control. Structurally a TMDB genre. */
export interface GenreOption {
  id: number;
  name: string;
}

/** Canonical, fully-resolved filter state for a browse view. */
export interface BrowseFilters {
  /** TMDB genre id, or null for "any genre". */
  genre: number | null;
  /** Minimum TMDB rating 1-10, or null for "any rating". */
  minRating: number | null;
  /** Release / first-air year, or null for "any year". */
  year: number | null;
  sort: BrowseSort;
  page: number;
}

/**
 * Compact, URL-facing shape: only non-default fields are present so a default
 * browse view stays at a clean `/movies` rather than carrying redundant params.
 * This is what `validateSearch` returns and what `Link`s target.
 */
export interface BrowseSearch {
  genre?: number;
  rating?: number;
  year?: number;
  sort?: BrowseSort;
  page?: number;
}

/**
 * TMDB's discover guards its "highest rated" sort with a vote-count floor so a
 * handful of glowing votes cannot top the list. We apply the same floor on every
 * request, not just the rating sort, so results stay to titles with real
 * traction regardless of the chosen order.
 */
export const VOTE_COUNT_FLOOR = 200;

const MAX_RATING = 10;
const MIN_RATING = 1;

/** TMDB caps pagination at 500 pages, so normalisation never asks for a page upstream refuses. */
export const MAX_BROWSE_PAGE = TMDB_MAX_PAGES;

/** Earliest year offered in the browse year control (older links still resolve via the normaliser's floor). */
export const BROWSE_YEAR_FLOOR = YEAR_FLOOR;

const normalizeSort = (value: unknown): BrowseSort =>
  BROWSE_SORTS.includes(value as BrowseSort) ? (value as BrowseSort) : DEFAULT_SORT;

const normalizeGenre = (value: unknown): number | null => {
  const id = toFiniteNumber(value);
  return id !== null && Number.isInteger(id) && id > 0 ? id : null;
};

/** Clamp an in-range rating; drop anything <= 0 or non-numeric (treated as "any"). */
const normalizeRating = (value: unknown): number | null => {
  const rating = toFiniteNumber(value);
  if (rating === null || rating <= 0) return null;
  return Math.min(Math.max(rating, MIN_RATING), MAX_RATING);
};

/**
 * Resolve any raw search record (typed search, hand-edited URL, stale link) into
 * a complete `BrowseFilters`. Out-of-range rating/year are clamped or dropped, an
 * unknown sort falls back to the default, and a bad page coerces to 1 — so an
 * invalid URL always resolves to a sane view rather than throwing.
 *
 * `currentYear` is injected for testability; production callers use the default.
 */
export const normalizeBrowseFilters = (
  search: Record<string, unknown>,
  currentYear: number = new Date().getFullYear(),
): BrowseFilters => ({
  genre: normalizeGenre(search.genre),
  minRating: normalizeRating(search.rating),
  year: normalizeYear(search.year, currentYear),
  sort: normalizeSort(search.sort),
  page: normalizePage(search.page, MAX_BROWSE_PAGE),
});

/**
 * Strip default-valued fields so the URL only carries what the viewer actually
 * set. This is what `validateSearch` returns, keeping shareable links minimal.
 */
export const toBrowseSearch = (filters: BrowseFilters): BrowseSearch => {
  const search: BrowseSearch = {};
  if (filters.genre !== null) search.genre = filters.genre;
  if (filters.minRating !== null) search.rating = filters.minRating;
  if (filters.year !== null) search.year = filters.year;
  if (filters.sort !== DEFAULT_SORT) search.sort = filters.sort;
  if (filters.page !== 1) search.page = filters.page;
  return search;
};

const MOVIE_SORT_BY: Record<BrowseSort, NonNullable<DiscoverMoviesOptions["sort_by"]>> = {
  popularity: "popularity.desc",
  newest: "release_date.desc",
  rating: "vote_average.desc",
};

const TV_SORT_BY: Record<BrowseSort, NonNullable<DiscoverTvOptions["sort_by"]>> = {
  popularity: "popularity.desc",
  newest: "first_air_date.desc",
  rating: "vote_average.desc",
};

/** Map canonical filters onto TMDB's discover/movie option bag. */
export const toDiscoverMovieOptions = (filters: BrowseFilters): DiscoverMoviesOptions => ({
  page: filters.page,
  sort_by: MOVIE_SORT_BY[filters.sort],
  with_genres: filters.genre !== null ? String(filters.genre) : undefined,
  primary_release_year: filters.year ?? undefined,
  vote_average_gte: filters.minRating ?? undefined,
  vote_count_gte: VOTE_COUNT_FLOOR,
});

/** Map canonical filters onto TMDB's discover/tv option bag. */
export const toDiscoverTvOptions = (filters: BrowseFilters): DiscoverTvOptions => ({
  page: filters.page,
  sort_by: TV_SORT_BY[filters.sort],
  with_genres: filters.genre !== null ? String(filters.genre) : undefined,
  first_air_date_year: filters.year ?? undefined,
  vote_average_gte: filters.minRating ?? undefined,
  vote_count_gte: VOTE_COUNT_FLOOR,
});

/** Stable cache-key fragment for a filter combination (media type scoped by caller). */
export const browseCacheKey = (filters: BrowseFilters): string =>
  `g${filters.genre ?? ""}:r${filters.minRating ?? ""}:y${filters.year ?? ""}:s${filters.sort}:p${filters.page}`;
