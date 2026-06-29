import { describe, it, expect } from "vite-plus/test";
import {
  crewByJob,
  extractOmdbRatings,
  formatWatchProvider,
  formatWatchProviders,
  selectProviderRegion,
  selectTrailerUrl,
} from "../formatters.js";
import type {
  TmdbWatchProvider,
  TmdbWatchProviderRegion,
  TmdbCrewMember,
  TmdbVideo,
  TmdbVideosResponse,
} from "../../tmdb/types.js";
import type { OmdbMovieDetails } from "../../omdb/types.js";

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

const crew = (overrides: Partial<TmdbCrewMember> = {}): TmdbCrewMember => ({
  id: 1,
  name: "Person",
  job: "Director",
  department: "Directing",
  profile_path: null,
  ...overrides,
});

describe("crewByJob", () => {
  it("filters by any matching job and preserves order", () => {
    const result = crewByJob(
      [
        crew({ id: 1, name: "Lana", job: "Director" }),
        crew({ id: 2, name: "Editor", job: "Editor" }),
        crew({ id: 3, name: "Lilly", job: "Writer" }),
      ],
      ["Director", "Writer"],
    );
    expect(result.map((member) => member.name)).toEqual(["Lana", "Lilly"]);
  });

  it("dedupes a person credited under several matching jobs, keeping the first", () => {
    const result = crewByJob(
      [
        crew({ id: 7, name: "Person", job: "Writer" }),
        crew({ id: 7, name: "Person", job: "Director" }),
      ],
      ["Director", "Writer"],
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.job).toBe("Writer");
  });

  it("returns an empty array for undefined crew", () => {
    expect(crewByJob(undefined, ["Director"])).toEqual([]);
  });
});

const region = (link: string): TmdbWatchProviderRegion => ({ link });

describe("selectProviderRegion", () => {
  it("picks the first preferred region present", () => {
    const selected = selectProviderRegion({ US: region("us"), SE: region("se") }, ["SE", "US"]);
    expect(selected?.region).toBe("SE");
  });

  it("falls back to the first available region when none preferred match", () => {
    const selected = selectProviderRegion({ DE: region("de") }, ["SE", "US"]);
    expect(selected?.region).toBe("DE");
  });

  it("returns null when there are no regions", () => {
    expect(selectProviderRegion({}, ["SE"])).toBeNull();
    expect(selectProviderRegion(undefined, ["SE"])).toBeNull();
  });
});

const video = (overrides: Partial<TmdbVideo> = {}): TmdbVideo => ({
  id: "v1",
  key: "abc",
  name: "Trailer",
  site: "YouTube",
  size: 1080,
  type: "Trailer",
  official: true,
  published_at: "2020-01-01",
  iso_639_1: "en",
  iso_3166_1: "US",
  ...overrides,
});

const videos = (results: TmdbVideo[]): TmdbVideosResponse => ({ id: 1, results });

describe("selectTrailerUrl", () => {
  it("prefers an official YouTube trailer", () => {
    const url = selectTrailerUrl(
      videos([
        video({ key: "teaser", type: "Teaser", official: true }),
        video({ key: "fan", type: "Trailer", official: false }),
        video({ key: "official", type: "Trailer", official: true }),
      ]),
    );
    expect(url).toBe("https://www.youtube.com/watch?v=official");
  });

  it("falls back to any YouTube trailer, then any YouTube video", () => {
    expect(
      selectTrailerUrl(videos([video({ key: "fan", type: "Trailer", official: false })])),
    ).toBe("https://www.youtube.com/watch?v=fan");
    expect(selectTrailerUrl(videos([video({ key: "clip", type: "Clip", official: false })]))).toBe(
      "https://www.youtube.com/watch?v=clip",
    );
  });

  it("returns null when there is no YouTube video", () => {
    expect(selectTrailerUrl(videos([video({ site: "Vimeo" })]))).toBeNull();
    expect(selectTrailerUrl(null)).toBeNull();
  });
});

const omdbDetails = (overrides: Partial<OmdbMovieDetails> = {}): OmdbMovieDetails =>
  ({
    imdbRating: "8.5",
    Ratings: [{ Source: "Rotten Tomatoes", Value: "92%" }],
    Awards: "Won 3 Oscars",
    ...overrides,
  }) as OmdbMovieDetails;

describe("extractOmdbRatings", () => {
  it("extracts IMDb, Rotten Tomatoes and awards", () => {
    expect(extractOmdbRatings(omdbDetails())).toEqual({
      ratings: [
        { source: "IMDb", value: "8.5/10" },
        { source: "Rotten Tomatoes", value: "92%" },
      ],
      awards: "Won 3 Oscars",
    });
  });

  it("skips N/A imdbRating and N/A awards, and ignores non-Rotten-Tomatoes sources", () => {
    const result = extractOmdbRatings(
      omdbDetails({
        imdbRating: "N/A",
        Awards: "N/A",
        Ratings: [
          { Source: "Metacritic", Value: "80/100" },
          { Source: "Rotten Tomatoes", Value: "75%" },
        ],
      }),
    );
    expect(result.ratings).toEqual([{ source: "Rotten Tomatoes", value: "75%" }]);
    expect(result.awards).toBeNull();
  });

  it("returns empty ratings and no awards for null", () => {
    expect(extractOmdbRatings(null)).toEqual({ ratings: [], awards: null });
  });
});
