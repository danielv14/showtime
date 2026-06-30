import { describe, it, expect } from "vite-plus/test";
import type { TmdbClient, OmdbClient } from "@showtime/core";
import { searchMoviesTool } from "../search-movies.js";
import { getNowPlayingTool } from "../get-now-playing.js";
import { getMovieTool } from "../get-movie.js";
import { getSeriesTool } from "../get-series.js";
import { getWhereToWatchTool } from "../get-where-to-watch.js";
import { registerTestTool, parseSuccess, createFakeClients } from "./harness.js";

/** A TMDB movie search result with the fields the formatter reads. */
const movieResult = (overrides: Partial<{ id: number; title: string }>) => ({
  id: 1,
  title: "Movie",
  original_title: "Movie",
  overview: "An overview.",
  release_date: "2021-10-22",
  poster_path: "/poster.jpg",
  backdrop_path: "/backdrop.jpg",
  vote_average: 8,
  vote_count: 1000,
  genre_ids: [],
  adult: false,
  ...overrides,
});

describe("search_movies (TMDB-backed, paginated)", () => {
  it("returns a paginated success response with formatted results", async () => {
    const tool = registerTestTool(
      searchMoviesTool,
      createFakeClients({
        tmdb: {
          searchMovies: async () =>
            ({
              page: 2,
              results: [movieResult({ id: 438631, title: "Dune" })],
              total_pages: 7,
              total_results: 130,
            }) as Awaited<ReturnType<TmdbClient["searchMovies"]>>,
        },
      }),
    );

    const response = await tool.invoke({ query: "dune", page: 2 });
    const payload = parseSuccess(response) as {
      results: { tmdbId: number; title: string; posterUrl: string }[];
      page: number;
      totalPages: number;
      totalResults: number;
    };

    expect(response.isError).toBeUndefined();
    expect(payload.results[0]).toMatchObject({ tmdbId: 438631, title: "Dune" });
    expect(payload.results[0]?.posterUrl).toContain("/poster.jpg");
    expect(payload.page).toBe(2);
    expect(payload.totalPages).toBe(7);
    expect(payload.totalResults).toBe(130);
  });

  it("caps an over-large total_pages in the paginated response", async () => {
    const tool = registerTestTool(
      searchMoviesTool,
      createFakeClients({
        tmdb: {
          searchMovies: async () =>
            ({
              page: 1,
              results: [],
              total_pages: 9999,
              total_results: 200000,
            }) as Awaited<ReturnType<TmdbClient["searchMovies"]>>,
        },
      }),
    );

    const payload = parseSuccess(await tool.invoke({ query: "x" })) as { totalPages: number };

    // capTotalPages clamps to TMDB_MAX_PAGES (500).
    expect(payload.totalPages).toBe(500);
  });
});

describe("get_now_playing (paginated, carries extra fields)", () => {
  it("includes the region alongside the standard pagination fields", async () => {
    const tool = registerTestTool(
      getNowPlayingTool,
      createFakeClients({
        tmdb: {
          getNowPlayingMovies: async () =>
            ({
              page: 1,
              results: [movieResult({ id: 5, title: "In Theaters" })],
              total_pages: 3,
              total_results: 50,
            }) as Awaited<ReturnType<TmdbClient["getNowPlayingMovies"]>>,
        },
      }),
    );

    const payload = parseSuccess(await tool.invoke({ region: "SE" })) as {
      region: string;
      results: { voteCount: number }[];
      totalPages: number;
    };

    expect(payload.region).toBe("SE");
    expect(payload.results[0]?.voteCount).toBe(1000);
    expect(payload.totalPages).toBe(3);
  });
});

describe("get_movie (hybrid OMDB + TMDB)", () => {
  it("merges OMDB ratings with TMDB details and credits", async () => {
    const tool = registerTestTool(
      getMovieTool,
      createFakeClients({
        tmdb: {
          getMovieDetails: async (id: number) =>
            ({
              id,
              title: "The Shawshank Redemption",
              imdb_id: "tt0111161",
              poster_path: "/poster.jpg",
              backdrop_path: "/backdrop.jpg",
              vote_average: 8.7,
              vote_count: 26000,
              budget: 25000000,
              revenue: 28341469,
              tagline: "Fear can hold you prisoner.",
              overview: "Two imprisoned men bond.",
              genres: [{ id: 18, name: "Drama" }],
              production_companies: [{ id: 1, name: "Castle Rock" }],
            }) as unknown as Awaited<ReturnType<TmdbClient["getMovieDetails"]>>,
          getMovieCredits: async () =>
            ({
              id: 278,
              cast: [{ id: 504, name: "Tim Robbins", character: "Andy", profile_path: "/a.jpg" }],
              crew: [
                { id: 4027, name: "Frank Darabont", job: "Director", department: "Directing" },
              ],
            }) as unknown as Awaited<ReturnType<TmdbClient["getMovieCredits"]>>,
        },
        omdb: {
          getById: async () =>
            ({
              Title: "The Shawshank Redemption",
              Year: "1994",
              Rated: "R",
              Released: "14 Oct 1994",
              Runtime: "142 min",
              Genre: "Drama",
              Director: "Frank Darabont",
              Writer: "Stephen King, Frank Darabont",
              Actors: "Tim Robbins, Morgan Freeman",
              Plot: "Two imprisoned men bond.",
              Language: "English",
              Country: "United States",
              Awards: "Nominated for 7 Oscars.",
              Ratings: [{ Source: "Internet Movie Database", Value: "9.3/10" }],
              Metascore: "82",
              imdbRating: "9.3",
              imdbVotes: "2,800,000",
              imdbID: "tt0111161",
              BoxOffice: "$28,767,189",
              Type: "movie",
              Response: "True",
            }) as unknown as Awaited<ReturnType<OmdbClient["getById"]>>,
        },
      }),
    );

    const payload = parseSuccess(await tool.invoke({ tmdbId: 278 })) as {
      title: string;
      imdbRating: string;
      tmdbRating: number;
      budget: number;
      cast: { name: string }[];
      crew: { directors: { name: string }[] };
    };

    // OMDB-sourced fields.
    expect(payload.title).toBe("The Shawshank Redemption");
    expect(payload.imdbRating).toBe("9.3");
    // TMDB-sourced fields.
    expect(payload.tmdbRating).toBe(8.7);
    expect(payload.budget).toBe(25000000);
    expect(payload.cast[0]?.name).toBe("Tim Robbins");
    expect(payload.crew.directors[0]?.name).toBe("Frank Darabont");
  });

  it("returns an error response when no identifier is provided (requireAtLeastOne)", async () => {
    const tool = registerTestTool(getMovieTool, createFakeClients({}));

    const response = await tool.invoke({});

    expect(response.isError).toBe(true);
    expect(response.content[0]?.text).toContain("At least one of");
    expect(response.content[0]?.text).toContain("getting movie details");
  });
});

describe("get_series (OMDB-only)", () => {
  it("shapes an OMDB series lookup by imdbId", async () => {
    const tool = registerTestTool(
      getSeriesTool,
      createFakeClients({
        omdb: {
          getById: async () =>
            ({
              Title: "Breaking Bad",
              Year: "2008-2013",
              Rated: "TV-MA",
              Released: "20 Jan 2008",
              Runtime: "49 min",
              Genre: "Crime, Drama, Thriller",
              Director: "N/A",
              Writer: "Vince Gilligan",
              Actors: "Bryan Cranston, Aaron Paul",
              Plot: "A chemistry teacher turns to crime.",
              Language: "English",
              Country: "United States",
              Awards: "Won 16 Primetime Emmys.",
              Ratings: [{ Source: "Internet Movie Database", Value: "9.5/10" }],
              Metascore: "N/A",
              imdbRating: "9.5",
              imdbVotes: "2,200,000",
              imdbID: "tt0903747",
              Type: "series",
              totalSeasons: "5",
              Response: "True",
            }) as unknown as Awaited<ReturnType<OmdbClient["getById"]>>,
        },
      }),
    );

    const payload = parseSuccess(await tool.invoke({ imdbId: "tt0903747" })) as {
      title: string;
      totalSeasons: string;
      imdbId: string;
    };

    expect(payload.title).toBe("Breaking Bad");
    expect(payload.totalSeasons).toBe("5");
    expect(payload.imdbId).toBe("tt0903747");
  });

  it("errors when the OMDB result is a movie, not a series", async () => {
    const tool = registerTestTool(
      getSeriesTool,
      createFakeClients({
        omdb: {
          getById: async () =>
            ({ Title: "Dune", Type: "movie", Response: "True" }) as unknown as Awaited<
              ReturnType<OmdbClient["getById"]>
            >,
        },
      }),
    );

    const response = await tool.invoke({ imdbId: "tt1160419" });

    expect(response.isError).toBe(true);
    expect(response.content[0]?.text).toContain("is a movie, not a series");
  });
});

describe("error response path", () => {
  it("wraps a thrown upstream error into an isError response with the tool context", async () => {
    const tool = registerTestTool(
      getWhereToWatchTool,
      createFakeClients({
        tmdb: {
          getMovieDetails: async () => {
            throw new Error("TMDB request to movie/1 failed with status 401");
          },
        },
      }),
    );

    const response = await tool.invoke({ tmdbId: 1 });

    expect(response.isError).toBe(true);
    // errorContext derives from the tool title, lowercased.
    expect(response.content[0]?.text).toBe(
      "Error get where to watch: TMDB request to movie/1 failed with status 401",
    );
  });
});
