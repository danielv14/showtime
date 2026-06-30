import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import { OmdbApiError } from "@showtime/core";
import { omdbCatch } from "../media.js";

// `omdbCatch` owns the OMDB ratings-fetch error policy shared by the movie and
// TV detail functions. It returns a `(error) => null` catch handler and folds
// the outcome back into the caller's `ratingsStatus` via `setStatus`.
describe("omdbCatch", () => {
  beforeEach(() => {
    // Reset call history so per-test log assertions don't see calls leaking
    // from a previous case, then re-silence (and let us assert) the structured
    // logs the handler emits via console.warn/error.
    vi.restoreAllMocks();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("returns null and leaves the status untouched for a not_found error", () => {
    const setStatus = vi.fn();
    const handler = omdbCatch("omdb.getById", { imdbId: "tt0111161" }, setStatus);

    const result = handler(new OmdbApiError("Movie not found!", "not_found"));

    expect(result).toBeNull();
    expect(setStatus).not.toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });

  it("returns null, flags rate_limited, and logs at warn for a rate_limited error", () => {
    const setStatus = vi.fn();
    const handler = omdbCatch("omdb.getById", { imdbId: "tt0111161" }, setStatus);

    const result = handler(new OmdbApiError("Request limit reached!", "rate_limited"));

    expect(result).toBeNull();
    expect(setStatus).toHaveBeenCalledTimes(1);
    expect(setStatus).toHaveBeenCalledWith("rate_limited");
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.error).not.toHaveBeenCalled();
  });

  it("returns null, flags unavailable, and logs at error for any other error", () => {
    const setStatus = vi.fn();
    const handler = omdbCatch("omdb.getByTitle", { title: "Heat", year: "1995" }, setStatus);

    const result = handler(new OmdbApiError("OMDB request timed out", "transient"));

    expect(result).toBeNull();
    expect(setStatus).toHaveBeenCalledTimes(1);
    expect(setStatus).toHaveBeenCalledWith("unavailable");
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("treats a non-OmdbApiError as a generic failure (unavailable, error log)", () => {
    const setStatus = vi.fn();
    const handler = omdbCatch("omdb.getById", { imdbId: "tt0111161" }, setStatus);

    const result = handler(new Error("network down"));

    expect(result).toBeNull();
    expect(setStatus).toHaveBeenCalledTimes(1);
    expect(setStatus).toHaveBeenCalledWith("unavailable");
    expect(console.error).toHaveBeenCalledTimes(1);
  });
});
