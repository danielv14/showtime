import { describe, it, expect, vi, afterEach } from "vite-plus/test";
import { createTmdbClient, TmdbApiError } from "../client.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createTmdbClient error handling", () => {
  it("throws TmdbApiError carrying the status code and endpoint on a non-2xx response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("Unauthorized", { status: 401 })),
    );

    const client = createTmdbClient("bad-key");

    const error = await client.getMovieDetails(123).catch((thrown: unknown) => thrown);

    expect(error).toBeInstanceOf(TmdbApiError);
    const tmdbError = error as TmdbApiError;
    expect(tmdbError.statusCode).toBe(401);
    expect(tmdbError.endpoint).toBe("movie/123");
    expect(tmdbError.message).toContain("401");
  });
});
