import { describe, it, expect, vi } from "vite-plus/test";
import { getGenresTool } from "../get-genres.js";
import { registerTestTool, parseSuccess, createFakeClients } from "./harness.js";

const movieGenres = [
  { id: 28, name: "Action" },
  { id: 35, name: "Comedy" },
];
const tvGenres = [
  { id: 10759, name: "Action & Adventure" },
  { id: 18, name: "Drama" },
];

describe("get_genres tool", () => {
  it("returns both movie and TV genre lists by default", async () => {
    const getMovieGenres = vi.fn(async () => movieGenres);
    const getTvGenres = vi.fn(async () => tvGenres);
    const tool = registerTestTool(
      getGenresTool,
      createFakeClients({ tmdb: { getMovieGenres, getTvGenres } }),
    );

    const result = parseSuccess(await tool.invoke({}));

    expect(getMovieGenres).toHaveBeenCalledOnce();
    expect(getTvGenres).toHaveBeenCalledOnce();
    expect(result).toEqual({ mediaType: "all", movieGenres, tvGenres });
  });

  it("returns only movie genres when mediaType is 'movie'", async () => {
    const getMovieGenres = vi.fn(async () => movieGenres);
    const getTvGenres = vi.fn(async () => tvGenres);
    const tool = registerTestTool(
      getGenresTool,
      createFakeClients({ tmdb: { getMovieGenres, getTvGenres } }),
    );

    const result = parseSuccess(await tool.invoke({ mediaType: "movie" })) as Record<
      string,
      unknown
    >;

    expect(getMovieGenres).toHaveBeenCalledOnce();
    expect(getTvGenres).not.toHaveBeenCalled();
    expect(result).toEqual({ mediaType: "movie", movieGenres });
    expect(result).not.toHaveProperty("tvGenres");
  });

  it("returns only TV genres when mediaType is 'tv'", async () => {
    const getMovieGenres = vi.fn(async () => movieGenres);
    const getTvGenres = vi.fn(async () => tvGenres);
    const tool = registerTestTool(
      getGenresTool,
      createFakeClients({ tmdb: { getMovieGenres, getTvGenres } }),
    );

    const result = parseSuccess(await tool.invoke({ mediaType: "tv" })) as Record<string, unknown>;

    expect(getTvGenres).toHaveBeenCalledOnce();
    expect(getMovieGenres).not.toHaveBeenCalled();
    expect(result).toEqual({ mediaType: "tv", tvGenres });
    expect(result).not.toHaveProperty("movieGenres");
  });

  it("exposes genres as name + id pairs", async () => {
    const tool = registerTestTool(
      getGenresTool,
      createFakeClients({
        tmdb: {
          getMovieGenres: async () => movieGenres,
          getTvGenres: async () => tvGenres,
        },
      }),
    );

    const result = parseSuccess(await tool.invoke({ mediaType: "movie" })) as {
      movieGenres: Array<{ id: number; name: string }>;
    };

    expect(result.movieGenres[0]).toEqual({ id: 28, name: "Action" });
  });
});
