import { describe, it, expect, vi } from "vite-plus/test";
import type { TmdbSearchResponse, TmdbTvSearchResult } from "@showtime/core";
import { getOnTheAirTool } from "../get-on-the-air.js";
import { createFakeClients, fakeGetImageUrl } from "./fake-clients.js";

const onTheAirShow: TmdbTvSearchResult = {
  id: 1399,
  name: "Game of Thrones",
  original_name: "Game of Thrones",
  overview: "Seven noble families fight for control of the land of Westeros.",
  first_air_date: "2011-04-17",
  poster_path: "/poster.jpg",
  backdrop_path: "/backdrop.jpg",
  vote_average: 8.4,
  vote_count: 21000,
  genre_ids: [10765, 18],
};

const buildResponse = (
  results: TmdbTvSearchResult[],
  page = 1,
): TmdbSearchResponse<TmdbTvSearchResult> => ({
  page,
  results,
  total_pages: 5,
  total_results: 100,
});

describe("get_on_the_air tool", () => {
  it("returns currently on-the-air series shaped with pagination metadata", async () => {
    const getOnTheAirTv = vi.fn(async () => buildResponse([onTheAirShow]));
    const clients = createFakeClients({
      tmdb: { getOnTheAirTv, getImageUrl: fakeGetImageUrl },
    });

    // paginatedResult is an opaque brand; assert the data it carries.
    const result = (await getOnTheAirTool.handler({}, clients)) as {
      apiResponse: TmdbSearchResponse<TmdbTvSearchResult>;
      data: { results: Array<{ tmdbId: number; name: string; voteCount: number }> };
    };

    expect(getOnTheAirTv).toHaveBeenCalledWith({ page: undefined });
    expect(result.apiResponse.total_results).toBe(100);
    expect(result.apiResponse.page).toBe(1);
    expect(result.apiResponse.total_pages).toBe(5);
    expect(result.data.results).toHaveLength(1);
    expect(result.data.results[0]).toMatchObject({
      tmdbId: 1399,
      name: "Game of Thrones",
      voteCount: 21000,
    });
  });

  it("forwards the requested page to the client", async () => {
    const getOnTheAirTv = vi.fn(async () => buildResponse([], 3));
    const clients = createFakeClients({
      tmdb: { getOnTheAirTv, getImageUrl: fakeGetImageUrl },
    });

    await getOnTheAirTool.handler({ page: 3 }, clients);

    expect(getOnTheAirTv).toHaveBeenCalledWith({ page: 3 });
  });

  it("returns an empty result list when the client has no shows", async () => {
    const getOnTheAirTv = vi.fn(async () => buildResponse([]));
    const clients = createFakeClients({
      tmdb: { getOnTheAirTv, getImageUrl: fakeGetImageUrl },
    });

    const result = (await getOnTheAirTool.handler({}, clients)) as {
      data: { results: unknown[] };
    };

    expect(result.data.results).toEqual([]);
  });
});
