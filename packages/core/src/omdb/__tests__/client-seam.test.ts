import { describe, it, expect } from "vite-plus/test";
import { createOmdbClient, OmdbApiError } from "../client.js";
import {
  createFakeHttpClient,
  failWith,
  type RecordedRequest,
} from "../../helpers/__tests__/fake-http-client.js";

describe("createOmdbClient through a fake HttpClient", () => {
  it("shapes a search request with apikey + type and parses the response", async () => {
    const fake = createFakeHttpClient(() => ({
      Search: [{ Title: "Dune", Year: "2021", imdbID: "tt1", Type: "movie", Poster: "x" }],
      totalResults: "1",
      Response: "True",
    }));
    const client = createOmdbClient("omdb-key", fake);

    const response = await client.searchMovies({ query: "dune", year: "2021", page: 2 });

    expect(fake.requests[0]?.endpoint).toBe("");
    expect(fake.requests[0]?.searchParams).toEqual({
      apikey: "omdb-key",
      s: "dune",
      type: "movie",
      y: "2021",
      page: 2,
    });
    expect(response.Search[0]?.Title).toBe("Dune");
  });

  it("passes the imdb id and plot length when fetching by id", async () => {
    const fake = createFakeHttpClient(() => ({
      Title: "Dune",
      Type: "movie",
      Response: "True",
    }));
    const client = createOmdbClient("omdb-key", fake);

    await client.getById({ imdbId: "tt1160419", plot: "full" });

    expect(fake.requests[0]?.searchParams).toEqual({
      apikey: "omdb-key",
      i: "tt1160419",
      plot: "full",
    });
  });

  it("translates a wire-level Response: False into OmdbApiError", async () => {
    const fake = createFakeHttpClient(() => ({
      Response: "False",
      Error: "Movie not found!",
    }));
    const client = createOmdbClient("omdb-key", fake);

    const error = await client.getById({ imdbId: "tt-missing" }).catch((thrown: unknown) => thrown);

    expect(error).toBeInstanceOf(OmdbApiError);
    expect((error as OmdbApiError).message).toBe("Movie not found!");
  });

  describe("getAllEpisodes", () => {
    it("skips a season fetch that fails rather than failing the whole series", async () => {
      const responder = (request: RecordedRequest): unknown => {
        const season = request.searchParams?.Season;
        // The details lookup (no Season param) reports a three-season series.
        if (season === undefined) {
          return { Title: "Show", Type: "series", totalSeasons: "3", Response: "True" };
        }
        // Season 2 is a gap: simulate a transport failure for it.
        if (season === 2) {
          throw failWith(404)(request);
        }
        return {
          Title: "Show",
          Season: String(season),
          totalSeasons: "3",
          Episodes: [],
          Response: "True",
        };
      };
      const fake = createFakeHttpClient(responder);
      const client = createOmdbClient("omdb-key", fake);

      const seasons = await client.getAllEpisodes({ seriesId: "tt-series" });

      // Seasons 1 and 3 survive; the failed season 2 is skipped, not fatal.
      expect(seasons.map((season) => season.Season)).toEqual(["1", "3"]);
    });

    it("returns an empty array for a non-series title", async () => {
      const fake = createFakeHttpClient(() => ({
        Title: "Dune",
        Type: "movie",
        Response: "True",
      }));
      const client = createOmdbClient("omdb-key", fake);

      const seasons = await client.getAllEpisodes({ seriesId: "tt-movie" });

      expect(seasons).toEqual([]);
    });
  });
});
