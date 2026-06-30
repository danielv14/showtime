import { describe, it, expect, vi } from "vite-plus/test";
import type { TmdbSearchResponse, TmdbTvSearchResult } from "@showtime/core";
import { getOnTheAirTool } from "../get-on-the-air.js";
import { registerTestTool, parseSuccess, createFakeClients } from "./harness.js";

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
    const tool = registerTestTool(getOnTheAirTool, createFakeClients({ tmdb: { getOnTheAirTv } }));

    const payload = parseSuccess(await tool.invoke({})) as {
      page: number;
      totalPages: number;
      totalResults: number;
      results: Array<{ tmdbId: number; name: string; voteCount: number }>;
    };

    expect(getOnTheAirTv).toHaveBeenCalledWith({ page: undefined });
    expect(payload.totalResults).toBe(100);
    expect(payload.page).toBe(1);
    expect(payload.totalPages).toBe(5);
    expect(payload.results).toHaveLength(1);
    expect(payload.results[0]).toMatchObject({
      tmdbId: 1399,
      name: "Game of Thrones",
      voteCount: 21000,
    });
  });

  it("forwards the requested page to the client", async () => {
    const getOnTheAirTv = vi.fn(async () => buildResponse([], 3));
    const tool = registerTestTool(getOnTheAirTool, createFakeClients({ tmdb: { getOnTheAirTv } }));

    await tool.invoke({ page: 3 });

    expect(getOnTheAirTv).toHaveBeenCalledWith({ page: 3 });
  });

  it("returns an empty result list when the client has no shows", async () => {
    const getOnTheAirTv = vi.fn(async () => buildResponse([]));
    const tool = registerTestTool(getOnTheAirTool, createFakeClients({ tmdb: { getOnTheAirTv } }));

    const payload = parseSuccess(await tool.invoke({})) as { results: unknown[] };

    expect(payload.results).toEqual([]);
  });
});
