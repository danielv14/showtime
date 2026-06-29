import { describe, it, expect } from "vite-plus/test";
import { formatWatchProvider, formatWatchProviders } from "../formatters.js";
import type { TmdbWatchProvider } from "../../tmdb/types.js";

const getImageUrl = (path: string | null, size: string = "w500"): string | null =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : null;

const provider = (overrides: Partial<TmdbWatchProvider> = {}): TmdbWatchProvider => ({
  provider_id: 8,
  provider_name: "Netflix",
  logo_path: "/netflix.jpg",
  ...overrides,
});

describe("formatWatchProvider", () => {
  it("maps name and builds a w92 logo URL via the callback", () => {
    expect(formatWatchProvider(provider(), getImageUrl)).toEqual({
      name: "Netflix",
      logoUrl: "https://image.tmdb.org/t/p/w92/netflix.jpg",
    });
  });
});

describe("formatWatchProviders", () => {
  it("maps every provider in the list", () => {
    const result = formatWatchProviders(
      [provider(), provider({ provider_name: "Max", logo_path: "/max.jpg" })],
      getImageUrl,
    );
    expect(result).toEqual([
      { name: "Netflix", logoUrl: "https://image.tmdb.org/t/p/w92/netflix.jpg" },
      { name: "Max", logoUrl: "https://image.tmdb.org/t/p/w92/max.jpg" },
    ]);
  });

  it("returns an empty array when the list is absent", () => {
    expect(formatWatchProviders(undefined, getImageUrl)).toEqual([]);
  });
});
