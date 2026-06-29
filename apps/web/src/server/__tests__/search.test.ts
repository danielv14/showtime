import { describe, it, expect } from "vite-plus/test";
import type {
  TmdbSearchResponse,
  TmdbMovieSearchResult,
  TmdbTvSearchResult,
  TmdbPersonSearchResult,
  TmdbMultiSearchResult,
} from "@showtime/core";
import {
  normalizeSearchFilters,
  toSearchSearch,
  searchCacheKey,
  runSearch,
  MAX_SEARCH_PAGE,
  type SearchClient,
  type SearchFilters,
} from "../search.js";

// Pure / injected-client tests: `search.ts` never builds a real client, fetches,
// caches, or reads secrets, so nothing here touches the network. The
// normalisation function is the single source of truth for "what does this
// search URL mean", and `runSearch` is the type dispatch — both carry the bulk
// of the coverage.

// A fixed "current year" so year clamping is deterministic across runs.
const NOW = 2026;
const normalize = (raw: Record<string, unknown>) => normalizeSearchFilters(raw, NOW);

describe("normalizeSearchFilters", () => {
  it("yields the default 'all' view for empty input", () => {
    expect(normalize({})).toEqual<SearchFilters>({
      query: "",
      type: "all",
      year: null,
      page: 1,
    });
  });

  it("round-trips a fully valid movie search unchanged", () => {
    expect(
      normalize({ q: "matrix", type: "movie", year: "1999", page: "2" }),
    ).toEqual<SearchFilters>({ query: "matrix", type: "movie", year: 1999, page: 2 });
  });

  it("trims the query but preserves its casing", () => {
    expect(normalize({ q: "  The Matrix  " }).query).toBe("The Matrix");
  });

  it("falls back to 'all' for an unknown type", () => {
    expect(normalize({ type: "bananas" }).type).toBe("all");
    expect(normalize({ type: 42 }).type).toBe("all");
  });

  it("keeps the year for movie and TV searches", () => {
    expect(normalize({ type: "movie", year: "1999" }).year).toBe(1999);
    expect(normalize({ type: "tv", year: "2011" }).year).toBe(2011);
  });

  it("drops the year for the 'all' and 'person' types", () => {
    expect(normalize({ type: "all", year: "1999" }).year).toBeNull();
    expect(normalize({ type: "person", year: "1999" }).year).toBeNull();
  });

  it("drops a year outside the plausible range or non-numeric, even for movies", () => {
    expect(normalize({ type: "movie", year: "1700" }).year).toBeNull();
    expect(normalize({ type: "movie", year: String(NOW + 50) }).year).toBeNull();
    expect(normalize({ type: "movie", year: "abc" }).year).toBeNull();
  });

  it("coerces a non-numeric, negative, or zero page to 1", () => {
    expect(normalize({ page: "abc" }).page).toBe(1);
    expect(normalize({ page: "-2" }).page).toBe(1);
    expect(normalize({ page: "0" }).page).toBe(1);
  });

  it("caps page at the TMDB ceiling and floors fractional pages", () => {
    expect(normalize({ page: "9999" }).page).toBe(MAX_SEARCH_PAGE);
    expect(normalize({ page: "3.9" }).page).toBe(3);
  });
});

describe("toSearchSearch", () => {
  it("strips default-valued fields for a clean URL", () => {
    expect(toSearchSearch(normalize({}))).toEqual({});
  });

  it("keeps a query-only search compact", () => {
    expect(toSearchSearch(normalize({ q: "matrix" }))).toEqual({ q: "matrix" });
  });

  it("keeps only the fields the viewer actually set", () => {
    expect(
      toSearchSearch(normalize({ q: "matrix", type: "movie", year: "1999", page: "2" })),
    ).toEqual({ q: "matrix", type: "movie", year: 1999, page: 2 });
  });
});

describe("searchCacheKey", () => {
  it("distinguishes different filter combinations", () => {
    const base = searchCacheKey(normalize({ q: "matrix", type: "movie", page: "1" }));
    expect(base).not.toBe(searchCacheKey(normalize({ q: "matrix", type: "movie", page: "2" })));
    expect(base).not.toBe(searchCacheKey(normalize({ q: "matrix", type: "tv", page: "1" })));
    expect(base).not.toBe(searchCacheKey(normalize({ q: "alien", type: "movie", page: "1" })));
  });

  it("lowercases the query so casing variants share an entry", () => {
    expect(searchCacheKey(normalize({ q: "The Matrix", type: "movie" }))).toBe(
      searchCacheKey(normalize({ q: "the matrix", type: "movie" })),
    );
  });
});

// ----- runSearch dispatch -----------------------------------------------------

const MOVIE: TmdbMovieSearchResult = {
  id: 603,
  title: "The Matrix",
  original_title: "The Matrix",
  overview: "A hacker learns the truth.",
  release_date: "1999-03-30",
  poster_path: "/p.jpg",
  backdrop_path: "/b.jpg",
  vote_average: 8.2,
  vote_count: 100,
  genre_ids: [],
  adult: false,
};

const TV: TmdbTvSearchResult = {
  id: 1399,
  name: "Game of Thrones",
  original_name: "Game of Thrones",
  overview: "Noble families vie for the throne.",
  first_air_date: "2011-04-17",
  poster_path: "/p.jpg",
  backdrop_path: "/b.jpg",
  vote_average: 8.4,
  vote_count: 100,
  genre_ids: [],
};

const PERSON: TmdbPersonSearchResult = {
  id: 287,
  name: "Brad Pitt",
  known_for_department: "Acting",
  profile_path: "/p.jpg",
  known_for: [{ id: 550, media_type: "movie", title: "Fight Club" }],
};

const MULTI: TmdbMultiSearchResult[] = [
  { id: 603, media_type: "movie", title: "The Matrix", vote_average: 8.2 },
  {
    id: 287,
    media_type: "person",
    name: "Brad Pitt",
    known_for_department: "Acting",
    known_for: [],
  },
];

interface RecordedCall {
  method: keyof SearchClient;
  query: string;
  options?: { page?: number; year?: number };
}

const makeClient = (totalPages = 1) => {
  const calls: RecordedCall[] = [];
  const respond = <T>(results: T[]): TmdbSearchResponse<T> => ({
    page: 1,
    results,
    total_pages: totalPages,
    total_results: results.length,
  });
  const client: SearchClient = {
    multiSearch: async (query, options) => {
      calls.push({ method: "multiSearch", query, options });
      return respond(MULTI);
    },
    searchMovies: async (query, options) => {
      calls.push({ method: "searchMovies", query, options });
      return respond([MOVIE]);
    },
    searchTv: async (query, options) => {
      calls.push({ method: "searchTv", query, options });
      return respond([TV]);
    },
    searchPerson: async (query, options) => {
      calls.push({ method: "searchPerson", query, options });
      return respond([PERSON]);
    },
  };
  return { client, calls };
};

describe("runSearch dispatch", () => {
  it("routes the movie type to searchMovies, forwarding the year and page", async () => {
    const { client, calls } = makeClient();
    const result = await runSearch(
      client,
      normalize({ q: "matrix", type: "movie", year: "1999", page: "2" }),
    );

    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe("searchMovies");
    expect(calls[0].query).toBe("matrix");
    expect(calls[0].options).toMatchObject({ page: 2, year: 1999 });
    expect(result.results.map((item) => item.mediaType)).toEqual(["movie"]);
    expect(result.results[0].id).toBe(603);
  });

  it("routes the TV type to searchTv, forwarding the year", async () => {
    const { client, calls } = makeClient();
    const result = await runSearch(client, normalize({ q: "thrones", type: "tv", year: "2011" }));

    expect(calls[0].method).toBe("searchTv");
    expect(calls[0].options).toMatchObject({ year: 2011 });
    expect(result.results.map((item) => item.mediaType)).toEqual(["tv"]);
  });

  it("routes the person type to searchPerson with no year", async () => {
    const { client, calls } = makeClient();
    const result = await runSearch(client, normalize({ q: "pitt", type: "person" }));

    expect(calls[0].method).toBe("searchPerson");
    expect(calls[0].options?.year).toBeUndefined();
    expect(result.results.map((item) => item.mediaType)).toEqual(["person"]);
  });

  it("routes the 'all' type to the blended multiSearch with no year", async () => {
    const { client, calls } = makeClient();
    const result = await runSearch(client, normalize({ q: "fight" }));

    expect(calls[0].method).toBe("multiSearch");
    expect(calls[0].options?.year).toBeUndefined();
    // The blended search keeps both media and people in one response.
    expect(result.results.map((item) => item.mediaType)).toEqual(["movie", "person"]);
  });

  it("caps total pages at the TMDB ceiling", async () => {
    const { client } = makeClient(600);
    const result = await runSearch(client, normalize({ q: "matrix", type: "movie" }));
    expect(result.totalPages).toBe(MAX_SEARCH_PAGE);
  });

  it("short-circuits a blank query to an empty page without any upstream call", async () => {
    const throwing: SearchClient = {
      multiSearch: async () => {
        throw new Error("should not be called");
      },
      searchMovies: async () => {
        throw new Error("should not be called");
      },
      searchTv: async () => {
        throw new Error("should not be called");
      },
      searchPerson: async () => {
        throw new Error("should not be called");
      },
    };
    const result = await runSearch(throwing, normalize({ q: "   " }));
    expect(result).toEqual({ results: [], page: 1, totalPages: 0 });
  });
});
