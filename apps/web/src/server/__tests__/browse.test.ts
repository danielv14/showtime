import { describe, it, expect } from "vite-plus/test";
import {
  browseCacheKey,
  normalizeBrowseFilters,
  toBrowseSearch,
  toDiscoverMovieOptions,
  toDiscoverTvOptions,
  VOTE_COUNT_FLOOR,
  MAX_BROWSE_PAGE,
  type BrowseFilters,
} from "../browse.js";

// Pure-function tests: `browse.ts` never fetches, caches, or reads secrets, so
// nothing here touches the network. The normalisation function is the single
// source of truth for "what does this browse URL mean", so it carries the bulk
// of the coverage.

// A fixed "current year" so year clamping is deterministic across runs.
const NOW = 2026;
const normalize = (raw: Record<string, unknown>) => normalizeBrowseFilters(raw, NOW);

describe("normalizeBrowseFilters", () => {
  it("yields the default browse view for empty input", () => {
    expect(normalize({})).toEqual<BrowseFilters>({
      genre: null,
      minRating: null,
      year: null,
      sort: "popularity",
      page: 1,
    });
  });

  it("round-trips a fully valid set of params unchanged", () => {
    expect(
      normalize({ genre: "28", rating: "7", year: "2023", sort: "rating", page: "3" }),
    ).toEqual<BrowseFilters>({
      genre: 28,
      minRating: 7,
      year: 2023,
      sort: "rating",
      page: 3,
    });
  });

  it("falls back to the default sort for an unknown sort key", () => {
    expect(normalize({ sort: "bananas" }).sort).toBe("popularity");
    expect(normalize({ sort: "release_date.desc" }).sort).toBe("popularity");
  });

  it("clamps an out-of-range rating into 1-10", () => {
    expect(normalize({ rating: "99" }).minRating).toBe(10);
    expect(normalize({ rating: "0.5" }).minRating).toBe(1);
  });

  it("drops a non-positive or non-numeric rating", () => {
    expect(normalize({ rating: "0" }).minRating).toBeNull();
    expect(normalize({ rating: "-3" }).minRating).toBeNull();
    expect(normalize({ rating: "good" }).minRating).toBeNull();
  });

  it("drops a year outside the plausible range", () => {
    expect(normalize({ year: "1700" }).year).toBeNull();
    expect(normalize({ year: String(NOW + 50) }).year).toBeNull();
    expect(normalize({ year: "2023" }).year).toBe(2023);
    // A near-future, announced year within the slack window is kept.
    expect(normalize({ year: String(NOW + 1) }).year).toBe(NOW + 1);
  });

  it("drops a non-positive or non-integer genre id", () => {
    expect(normalize({ genre: "0" }).genre).toBeNull();
    expect(normalize({ genre: "-5" }).genre).toBeNull();
    expect(normalize({ genre: "abc" }).genre).toBeNull();
    expect(normalize({ genre: "28" }).genre).toBe(28);
  });

  it("coerces a non-numeric, negative, or zero page to 1", () => {
    expect(normalize({ page: "abc" }).page).toBe(1);
    expect(normalize({ page: "-2" }).page).toBe(1);
    expect(normalize({ page: "0" }).page).toBe(1);
  });

  it("caps page at the TMDB ceiling and floors fractional pages", () => {
    expect(normalize({ page: "9999" }).page).toBe(MAX_BROWSE_PAGE);
    expect(normalize({ page: "3.9" }).page).toBe(3);
  });
});

describe("toBrowseSearch", () => {
  it("strips default-valued fields for a clean URL", () => {
    expect(toBrowseSearch(normalize({}))).toEqual({});
  });

  it("keeps only the fields the viewer actually set", () => {
    expect(toBrowseSearch(normalize({ genre: "28", sort: "rating", page: "2" }))).toEqual({
      genre: 28,
      sort: "rating",
      page: 2,
    });
  });
});

describe("toDiscoverMovieOptions", () => {
  it("maps a representative filter onto TMDB discover/movie options", () => {
    const filters = normalize({
      genre: "28",
      rating: "7",
      year: "2023",
      sort: "rating",
      page: "2",
    });
    expect(toDiscoverMovieOptions(filters)).toEqual({
      page: 2,
      sort_by: "vote_average.desc",
      with_genres: "28",
      primary_release_year: 2023,
      vote_average_gte: 7,
      vote_count_gte: VOTE_COUNT_FLOOR,
    });
  });

  it("omits unset filters but always applies the vote-count floor", () => {
    const options = toDiscoverMovieOptions(normalize({}));
    expect(options.with_genres).toBeUndefined();
    expect(options.primary_release_year).toBeUndefined();
    expect(options.vote_average_gte).toBeUndefined();
    expect(options.sort_by).toBe("popularity.desc");
    expect(options.vote_count_gte).toBe(VOTE_COUNT_FLOOR);
  });

  it("maps the newest sort to release_date.desc", () => {
    expect(toDiscoverMovieOptions(normalize({ sort: "newest" })).sort_by).toBe("release_date.desc");
  });
});

describe("toDiscoverTvOptions", () => {
  it("maps year onto first_air_date_year and newest onto first_air_date.desc", () => {
    const filters = normalize({ year: "2020", sort: "newest", genre: "18" });
    expect(toDiscoverTvOptions(filters)).toEqual({
      page: 1,
      sort_by: "first_air_date.desc",
      with_genres: "18",
      first_air_date_year: 2020,
      vote_average_gte: undefined,
      vote_count_gte: VOTE_COUNT_FLOOR,
    });
  });
});

describe("browseCacheKey", () => {
  it("distinguishes different filter combinations", () => {
    const a = browseCacheKey(normalize({ genre: "28", page: "2" }));
    const b = browseCacheKey(normalize({ genre: "28", page: "3" }));
    const c = browseCacheKey(normalize({ genre: "35", page: "2" }));
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
  });

  it("is stable for the same filter combination", () => {
    expect(browseCacheKey(normalize({ genre: "28", rating: "7" }))).toBe(
      browseCacheKey(normalize({ genre: "28", rating: "7" })),
    );
  });
});
