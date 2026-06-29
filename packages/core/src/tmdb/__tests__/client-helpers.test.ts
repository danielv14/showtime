import { describe, it, expect } from "vite-plus/test";
import { buildSearchParams, mediaPath } from "../client.js";

describe("buildSearchParams", () => {
  it("includes only defined keys", () => {
    expect(buildSearchParams({ query: "dune", page: 2, year: undefined })).toEqual({
      query: "dune",
      page: 2,
    });
  });

  it("drops every undefined value", () => {
    expect(buildSearchParams({ page: undefined, region: undefined })).toEqual({});
  });

  it("renames the dotted range params to their TMDB names", () => {
    expect(
      buildSearchParams({
        vote_average_gte: 7,
        vote_average_lte: 9,
        vote_count_gte: 50,
        with_runtime_gte: 60,
        with_runtime_lte: 150,
      }),
    ).toEqual({
      "vote_average.gte": 7,
      "vote_average.lte": 9,
      "vote_count.gte": 50,
      "with_runtime.gte": 60,
      "with_runtime.lte": 150,
    });
  });

  it("passes through keys that already match TMDB param names", () => {
    expect(
      buildSearchParams({
        page: 1,
        region: "SE",
        sort_by: "popularity.desc",
        with_genres: "28",
        first_air_date_year: 2023,
      }),
    ).toEqual({
      page: 1,
      region: "SE",
      sort_by: "popularity.desc",
      with_genres: "28",
      first_air_date_year: 2023,
    });
  });

  it("keeps a defined zero rather than treating it as absent", () => {
    expect(buildSearchParams({ page: 0 })).toEqual({ page: 0 });
  });
});

describe("mediaPath", () => {
  it("builds movie paths for each twin suffix", () => {
    expect(mediaPath("movie", 123, "similar")).toBe("movie/123/similar");
    expect(mediaPath("movie", 123, "recommendations")).toBe("movie/123/recommendations");
    expect(mediaPath("movie", 123, "reviews")).toBe("movie/123/reviews");
    expect(mediaPath("movie", 123, "videos")).toBe("movie/123/videos");
    expect(mediaPath("movie", 123, "watch/providers")).toBe("movie/123/watch/providers");
  });

  it("builds tv paths for each twin suffix", () => {
    expect(mediaPath("tv", 456, "similar")).toBe("tv/456/similar");
    expect(mediaPath("tv", 456, "recommendations")).toBe("tv/456/recommendations");
    expect(mediaPath("tv", 456, "reviews")).toBe("tv/456/reviews");
    expect(mediaPath("tv", 456, "videos")).toBe("tv/456/videos");
    expect(mediaPath("tv", 456, "watch/providers")).toBe("tv/456/watch/providers");
  });
});
