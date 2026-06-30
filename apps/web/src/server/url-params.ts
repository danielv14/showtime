/**
 * Shared URL-search-param normalizers used by both the browse and search server
 * modules. These are pure helpers that turn raw, untrusted query values (typed
 * searches, hand-edited URLs, stale links) into canonical values, so an invalid
 * URL always resolves to a sane view rather than throwing.
 *
 * The module-specific `normalize{Browse,Search}Filters` orchestrators stay in
 * their own modules; only the byte-identical primitives live here.
 */

/** Earliest plausible release year (the Lumière brothers era); anything older is a stale/typo'd param. */
export const MIN_YEAR = 1874;

/** How far past the current year a year filter may reach (announced future titles). */
export const FUTURE_YEAR_SLACK = 5;

/**
 * Earliest year offered in a year-filter control. Narrower than the normaliser's
 * `MIN_YEAR` floor (which still accepts older hand-edited links); this is just
 * the oldest year worth listing as a dropdown option. Shared by the browse and
 * search routes so the span is defined once.
 */
export const YEAR_FLOOR = 1950;

/** Coerce a raw param to a finite number, or null when it is missing/blank/non-numeric. */
export const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

/** Accept an integer year within `[MIN_YEAR, currentYear + FUTURE_YEAR_SLACK]`; null otherwise. */
export const normalizeYear = (value: unknown, currentYear: number): number | null => {
  const year = toFiniteNumber(value);
  if (year === null || !Number.isInteger(year)) return null;
  return year >= MIN_YEAR && year <= currentYear + FUTURE_YEAR_SLACK ? year : null;
};

/** Clamp a 1-based page into `[1, maxPage]`; a bad value coerces to 1. */
export const normalizePage = (value: unknown, maxPage: number): number => {
  const page = toFiniteNumber(value);
  if (page === null || page < 1) return 1;
  return Math.min(Math.floor(page), maxPage);
};
