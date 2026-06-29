import { describe, it, expect } from "vite-plus/test";
import { createTmdbClient, TmdbApiError } from "../client.js";
import { createFakeHttpClient, failWith } from "../../helpers/__tests__/fake-http-client.js";

describe("createTmdbClient through a fake HttpClient", () => {
  it("shapes a search request and parses the response without a network call", async () => {
    const fake = createFakeHttpClient(() => ({
      page: 1,
      results: [{ id: 42, title: "Dune" }],
      total_pages: 1,
      total_results: 1,
    }));
    const client = createTmdbClient("test-key", fake);

    const response = await client.searchMovies("dune", { page: 2, year: 2021 });

    expect(fake.requests).toHaveLength(1);
    expect(fake.requests[0]?.endpoint).toBe("search/movie");
    expect(fake.requests[0]?.searchParams).toEqual({ query: "dune", page: 2, year: 2021 });
    expect(response.results[0]?.id).toBe(42);
  });

  it("renames the dotted discover params and hits the discover endpoint", async () => {
    const fake = createFakeHttpClient(() => ({
      page: 1,
      results: [],
      total_pages: 0,
      total_results: 0,
    }));
    const client = createTmdbClient("test-key", fake);

    await client.discoverMovies({
      sort_by: "vote_average.desc",
      vote_average_gte: 7,
      vote_count_gte: 100,
      with_runtime_lte: 150,
    });

    expect(fake.requests[0]?.endpoint).toBe("discover/movie");
    expect(fake.requests[0]?.searchParams).toEqual({
      sort_by: "vote_average.desc",
      "vote_average.gte": 7,
      "vote_count.gte": 100,
      "with_runtime.lte": 150,
    });
  });

  it("builds twin movie sub-resource endpoint paths", async () => {
    const fake = createFakeHttpClient(() => ({
      page: 1,
      results: [],
      total_pages: 0,
      total_results: 0,
    }));
    const client = createTmdbClient("test-key", fake);

    await client.getSimilarMovies(123, { page: 3 });

    expect(fake.requests[0]?.endpoint).toBe("movie/123/similar");
    expect(fake.requests[0]?.searchParams).toEqual({ page: 3 });
  });

  it("surfaces a transport failure as TmdbApiError with statusCode + endpoint", async () => {
    const fake = createFakeHttpClient(failWith(401));
    const client = createTmdbClient("bad-key", fake);

    const error = await client.getMovieDetails(123).catch((thrown: unknown) => thrown);

    expect(error).toBeInstanceOf(TmdbApiError);
    const tmdbError = error as TmdbApiError;
    expect(tmdbError.statusCode).toBe(401);
    expect(tmdbError.endpoint).toBe("movie/123");
    expect(tmdbError.message).toContain("401");
  });

  it("surfaces a transport timeout as TmdbApiError carrying the endpoint", async () => {
    const fake = createFakeHttpClient(failWith(undefined, true));
    const client = createTmdbClient("test-key", fake);

    const error = await client.getMovieDetails(7).catch((thrown: unknown) => thrown);

    expect(error).toBeInstanceOf(TmdbApiError);
    const tmdbError = error as TmdbApiError;
    expect(tmdbError.statusCode).toBeUndefined();
    expect(tmdbError.endpoint).toBe("movie/7");
    expect(tmdbError.message).toContain("timed out");
  });
});
