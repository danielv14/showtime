import { describe, it, expect } from "vite-plus/test";
import {
  atLeastOneMessage,
  requireAtLeastOne,
  resolveMedia,
  resolveMovieOrTv,
  resolveMovieAcrossSources,
} from "../helpers/resolvers.js";
import type { TmdbClient } from "@showtime/core";
import { createFakeClients, createFakeTmdbClient, createFakeOmdbClient } from "./harness.js";

describe("requireAtLeastOne", () => {
  it("returns null when at least one field has a value", () => {
    const result = requireAtLeastOne("doing a thing", { a: undefined, b: 5 });
    expect(result).toBeNull();
  });

  it("returns a structured error response when every field is empty", () => {
    const result = requireAtLeastOne("doing a thing", { a: undefined, b: null });

    expect(result).not.toBeNull();
    expect(result?.isError).toBe(true);
    expect(result?.content[0]?.text).toBe(`Error doing a thing: ${atLeastOneMessage(["a", "b"])}`);
  });
});

describe("resolveMedia", () => {
  it("throws the at-least-one guard message when no identifier is given", async () => {
    const clients = createFakeClients({});

    await expect(resolveMedia(clients, {})).rejects.toThrow(
      atLeastOneMessage(["tmdbId", "imdbId", "title"]),
    );
  });

  it("resolves a movie by tmdbId via getMovieDetails", async () => {
    const clients = createFakeClients({
      tmdb: {
        getMovieDetails: async (id: number) =>
          ({ id, title: "Dune" }) as Awaited<
            ReturnType<import("@showtime/core").TmdbClient["getMovieDetails"]>
          >,
      },
    });

    const media = await resolveMedia(clients, { tmdbId: 438631 });

    expect(media).toEqual({ type: "movie", id: 438631, name: "Dune" });
  });

  it("resolves a movie by title via searchMovies, taking the first result", async () => {
    const clients = createFakeClients({
      tmdb: {
        searchMovies: async () =>
          ({
            page: 1,
            results: [
              { id: 11, title: "First" },
              { id: 22, title: "Second" },
            ],
            total_pages: 1,
            total_results: 2,
          }) as Awaited<ReturnType<import("@showtime/core").TmdbClient["searchMovies"]>>,
      },
    });

    const media = await resolveMedia(clients, { title: "First" });

    expect(media).toEqual({ type: "movie", id: 11, name: "First" });
  });

  it("resolves a TV series by tmdbId via getTvDetails", async () => {
    const clients = createFakeClients({
      tmdb: {
        getTvDetails: async (id: number) =>
          ({ id, name: "Breaking Bad" }) as Awaited<
            ReturnType<import("@showtime/core").TmdbClient["getTvDetails"]>
          >,
      },
    });

    const media = await resolveMedia(clients, { mediaType: "tv", tmdbId: 1396 });

    expect(media).toEqual({ type: "tv", id: 1396, name: "Breaking Bad" });
  });

  it("rejects an IMDb-id-only lookup for TV (movie-only rule)", async () => {
    const clients = createFakeClients({});

    await expect(resolveMedia(clients, { mediaType: "tv", imdbId: "tt0903747" })).rejects.toThrow(
      "IMDb ID lookup is only supported for movies",
    );
  });

  it("throws when a title search yields no results", async () => {
    const clients = createFakeClients({
      tmdb: {
        searchMovies: async () =>
          ({ page: 1, results: [], total_pages: 0, total_results: 0 }) as Awaited<
            ReturnType<import("@showtime/core").TmdbClient["searchMovies"]>
          >,
      },
    });

    await expect(resolveMedia(clients, { title: "Nonexistent" })).rejects.toThrow(
      "No movies found matching title: Nonexistent",
    );
  });
});

describe("resolveMovieOrTv", () => {
  it("throws the movieId/tvId guard message when neither id is given", async () => {
    const clients = createFakeClients({});

    await expect(resolveMovieOrTv(clients, {})).rejects.toThrow(
      atLeastOneMessage(["movieId", "tvId"]),
    );
  });

  it("resolves a movie when movieId is given", async () => {
    const clients = createFakeClients({
      tmdb: {
        getMovieDetails: async (id: number) =>
          ({ id, title: "Dune" }) as Awaited<
            ReturnType<import("@showtime/core").TmdbClient["getMovieDetails"]>
          >,
      },
    });

    const media = await resolveMovieOrTv(clients, { movieId: 438631 });

    expect(media).toEqual({ type: "movie", id: 438631, name: "Dune" });
  });

  it("resolves a TV series when tvId is given", async () => {
    const clients = createFakeClients({
      tmdb: {
        getTvDetails: async (id: number) =>
          ({ id, name: "Breaking Bad" }) as Awaited<
            ReturnType<import("@showtime/core").TmdbClient["getTvDetails"]>
          >,
      },
    });

    const media = await resolveMovieOrTv(clients, { tvId: 1396 });

    expect(media).toEqual({ type: "tv", id: 1396, name: "Breaking Bad" });
  });
});

describe("resolveMovieAcrossSources", () => {
  it("passes an imdbId through without hitting TMDB", async () => {
    const tmdb = createFakeTmdbClient({});

    const resolved = await resolveMovieAcrossSources(tmdb, { imdbId: "tt0111161" });

    expect(resolved).toEqual({ imdbId: "tt0111161", tmdbId: undefined, tmdbDetails: undefined });
  });

  it("crosses a tmdbId to its imdb_id, returning the details it fetched", async () => {
    const tmdb = createFakeTmdbClient({
      getMovieDetails: async (id: number) =>
        ({ id, imdb_id: "tt0111161", title: "Shawshank" }) as unknown as Awaited<
          ReturnType<TmdbClient["getMovieDetails"]>
        >,
    });

    const resolved = await resolveMovieAcrossSources(tmdb, { tmdbId: 278 });

    expect(resolved.imdbId).toBe("tt0111161");
    expect(resolved.tmdbId).toBe(278);
    expect(resolved.tmdbDetails?.title).toBe("Shawshank");
  });

  it("resolves a title by searching then fetching the first hit's details", async () => {
    const tmdb = createFakeTmdbClient({
      searchMovies: async () =>
        ({
          page: 1,
          results: [{ id: 603 }],
          total_pages: 1,
          total_results: 1,
        }) as unknown as Awaited<ReturnType<TmdbClient["searchMovies"]>>,
      getMovieDetails: async (id: number) =>
        ({ id, imdb_id: "tt0133093" }) as unknown as Awaited<
          ReturnType<TmdbClient["getMovieDetails"]>
        >,
    });

    const resolved = await resolveMovieAcrossSources(tmdb, { title: "The Matrix" });

    expect(resolved.tmdbId).toBe(603);
    expect(resolved.imdbId).toBe("tt0133093");
  });
});

describe("fake client guards", () => {
  it("throws a descriptive error when a tool calls an unstubbed TMDB method", () => {
    const tmdb = createFakeTmdbClient({});
    expect(() => tmdb.getMovieDetails(1)).toThrow("Unexpected TMDB call: getMovieDetails");
  });

  it("throws a descriptive error when a tool calls an unstubbed OMDB method", () => {
    const omdb = createFakeOmdbClient({});
    expect(() => omdb.getById({ imdbId: "tt1" })).toThrow("Unexpected OMDB call: getById");
  });
});
