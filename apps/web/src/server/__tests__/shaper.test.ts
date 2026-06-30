import { describe, it, expect } from "vite-plus/test";
import type {
  TmdbVideosResponse,
  TmdbWatchProviders,
  TmdbCombinedCredit,
  TmdbPersonCombinedCredits,
  TmdbPersonDetails,
  TmdbReview,
  TmdbReviewsResponse,
  OmdbMovieDetails,
  OmdbSeasonResponse,
} from "@showtime/core";
import {
  firstTrailerUrl,
  mapOmdbRatings,
  mapProviders,
  rankSimilar,
  shapeEpisodeRatings,
  shapePerson,
  shapeReviews,
  shapeTv,
  type MediaItem,
} from "../shaper.js";

// These are pure-function tests: the shaper takes already-fetched upstream data
// and returns UI shapes, so nothing here touches the network or the cache.

const mediaItem = (overrides: Partial<MediaItem>): MediaItem => ({
  id: 1,
  mediaType: "movie",
  title: "Untitled",
  year: "2000",
  rating: 0,
  posterUrl: "https://image.tmdb.org/t/p/w342/poster.jpg",
  backdropUrl: null,
  overview: "",
  ...overrides,
});

describe("rankSimilar", () => {
  it("keeps TMDB relevance order as the dominant signal", () => {
    // Same year and rating across items, so only relevance (input order)
    // distinguishes them. Order must be preserved.
    const items = [
      mediaItem({ id: 1, year: "2010", rating: 7 }),
      mediaItem({ id: 2, year: "2010", rating: 7 }),
      mediaItem({ id: 3, year: "2010", rating: 7 }),
    ];
    const ranked = rankSimilar(items, 2024);
    expect(ranked.map((item) => item.id)).toEqual([1, 2, 3]);
  });

  it("nudges a newer, higher-rated title up a few spots without burying the top pick", () => {
    // Eleven old, unrated items (relevance gap of 0.1 between adjacent ranks),
    // except id 5 at index 4 which is brand new and top-rated. Its recency +
    // rating boost (0.3) lifts it above the items TMDB ranked just ahead of it
    // (ids 3 and 4), but the relevance leader (id 1) is not buried.
    const items = Array.from({ length: 11 }, (_, index) =>
      index === 4
        ? mediaItem({ id: index + 1, year: "2024", rating: 10 })
        : mediaItem({ id: index + 1, year: "1990", rating: 0 }),
    );
    const ranked = rankSimilar(items, 2024);
    // id 1 (relevance leader) stays on top; id 5 rose from 5th to 3rd.
    expect(ranked[0].id).toBe(1);
    expect(ranked.slice(0, 4).map((item) => item.id)).toEqual([1, 2, 5, 3]);
  });

  it("dedupes by id, keeping the first occurrence", () => {
    const items = [
      mediaItem({ id: 7, year: "2010", rating: 7 }),
      mediaItem({ id: 7, year: "2010", rating: 7 }),
      mediaItem({ id: 9, year: "2010", rating: 7 }),
    ];
    const ranked = rankSimilar(items, 2024);
    expect(ranked.map((item) => item.id)).toEqual([7, 9]);
  });

  it("drops poster-less entries", () => {
    const items = [
      mediaItem({ id: 1, posterUrl: null }),
      mediaItem({ id: 2, posterUrl: "https://image.tmdb.org/t/p/w342/p.jpg" }),
    ];
    const ranked = rankSimilar(items, 2024);
    expect(ranked.map((item) => item.id)).toEqual([2]);
  });

  it("caps the result at the similar limit (18)", () => {
    const items = Array.from({ length: 30 }, (_, index) =>
      mediaItem({ id: index + 1, year: "2010", rating: 7 }),
    );
    const ranked = rankSimilar(items, 2024);
    expect(ranked).toHaveLength(18);
  });

  it("is stable for the same year regardless of when it runs (purity)", () => {
    const items = [
      mediaItem({ id: 1, year: "1990", rating: 5 }),
      mediaItem({ id: 2, year: "2020", rating: 8 }),
      mediaItem({ id: 3, year: "2005", rating: 6 }),
    ];
    expect(rankSimilar(items, 2024)).toEqual(rankSimilar(items, 2024));
  });
});

describe("shapeEpisodeRatings", () => {
  const season = (
    seasonNumber: string,
    episodes: OmdbSeasonResponse["Episodes"],
  ): OmdbSeasonResponse => ({
    Title: "Show",
    Season: seasonNumber,
    totalSeasons: "2",
    Episodes: episodes,
    Response: "True",
  });

  it("averages per season over rated episodes, sorts, and computes maxEpisodes", () => {
    const seasons: OmdbSeasonResponse[] = [
      // Provided out of order to verify both season and episode sorting.
      season("2", [
        { Title: "S2E2", Released: "2021-01-08", Episode: "2", imdbRating: "9.0", imdbID: "tt22" },
        { Title: "S2E1", Released: "2021-01-01", Episode: "1", imdbRating: "8.0", imdbID: "tt21" },
        { Title: "S2E3", Released: "2021-01-15", Episode: "3", imdbRating: "N/A", imdbID: "tt23" },
      ]),
      season("1", [
        { Title: "S1E1", Released: "2020-01-01", Episode: "1", imdbRating: "7.0", imdbID: "tt11" },
        { Title: "S1E2", Released: "2020-01-08", Episode: "2", imdbRating: "8.0", imdbID: "tt12" },
      ]),
    ];

    const result = shapeEpisodeRatings(seasons);

    expect(result.seasons.map((s) => s.season)).toEqual([1, 2]);
    // Season 1: (7 + 8) / 2 = 7.5
    expect(result.seasons[0].average).toBeCloseTo(7.5);
    // Season 2: only the two rated episodes count: (8 + 9) / 2 = 8.5
    expect(result.seasons[1].average).toBeCloseTo(8.5);
    // Episodes sorted ascending; the N/A episode keeps a null rating.
    expect(result.seasons[1].episodes.map((e) => e.episode)).toEqual([1, 2, 3]);
    expect(result.seasons[1].episodes[2].rating).toBeNull();
    // maxEpisodes is the highest episode number across all seasons.
    expect(result.maxEpisodes).toBe(3);
  });

  it("yields a null average when no episode is rated", () => {
    const seasons: OmdbSeasonResponse[] = [
      season("1", [
        { Title: "E1", Released: "2020-01-01", Episode: "1", imdbRating: "N/A", imdbID: "tt1" },
      ]),
    ];
    const result = shapeEpisodeRatings(seasons);
    expect(result.seasons[0].average).toBeNull();
  });

  it("drops seasons with no parseable episodes", () => {
    const seasons: OmdbSeasonResponse[] = [
      season("1", [
        { Title: "Bad", Released: "2020-01-01", Episode: "N/A", imdbRating: "7.0", imdbID: "tt1" },
      ]),
    ];
    const result = shapeEpisodeRatings(seasons);
    expect(result.seasons).toHaveLength(0);
    expect(result.maxEpisodes).toBe(0);
  });
});

describe("mapProviders", () => {
  const withRegions = (regions: string[]): TmdbWatchProviders => ({
    id: 1,
    results: Object.fromEntries(
      regions.map((region) => [
        region,
        {
          link: `https://tmdb/${region}`,
          flatrate: [{ provider_id: 8, provider_name: "Netflix", logo_path: "/n.jpg" }],
          rent: [],
          buy: [],
        },
      ]),
    ),
  });

  it("prefers SE when present", () => {
    const result = mapProviders(withRegions(["US", "SE", "GB"]));
    expect(result?.region).toBe("SE");
    expect(result?.flatrate[0]).toEqual({
      name: "Netflix",
      logoUrl: "https://image.tmdb.org/t/p/w92/n.jpg",
    });
  });

  it("falls back through the preferred-region order to US then GB", () => {
    expect(mapProviders(withRegions(["GB", "US"]))?.region).toBe("US");
    expect(mapProviders(withRegions(["GB"]))?.region).toBe("GB");
  });

  it("falls back to the first available region when none are preferred", () => {
    expect(mapProviders(withRegions(["DE", "FR"]))?.region).toBe("DE");
  });

  it("returns null when there are no providers", () => {
    expect(mapProviders(null)).toBeNull();
    expect(mapProviders({ id: 1, results: {} })).toBeNull();
  });
});

describe("firstTrailerUrl", () => {
  const video = (overrides: Partial<TmdbVideosResponse["results"][number]>) => ({
    id: "v",
    key: "KEY",
    name: "Video",
    site: "YouTube",
    size: 1080,
    type: "Trailer",
    official: true,
    published_at: "2020-01-01",
    iso_639_1: "en",
    iso_3166_1: "US",
    ...overrides,
  });

  it("prefers an official YouTube trailer", () => {
    const videos: TmdbVideosResponse = {
      id: 1,
      results: [
        video({ key: "TEASER", type: "Teaser" }),
        video({ key: "UNOFFICIAL", official: false }),
        video({ key: "OFFICIAL", official: true }),
      ],
    };
    expect(firstTrailerUrl(videos)).toBe("https://www.youtube.com/watch?v=OFFICIAL");
  });

  it("falls back to any YouTube trailer, then any YouTube video", () => {
    const trailerOnly: TmdbVideosResponse = {
      id: 1,
      results: [video({ key: "UNOFFICIAL", type: "Trailer", official: false })],
    };
    expect(firstTrailerUrl(trailerOnly)).toBe("https://www.youtube.com/watch?v=UNOFFICIAL");

    const clipOnly: TmdbVideosResponse = {
      id: 1,
      results: [video({ key: "CLIP", type: "Clip", official: false })],
    };
    expect(firstTrailerUrl(clipOnly)).toBe("https://www.youtube.com/watch?v=CLIP");
  });

  it("returns null when there is no YouTube video", () => {
    const vimeoOnly: TmdbVideosResponse = {
      id: 1,
      results: [video({ key: "VIMEO", site: "Vimeo" })],
    };
    expect(firstTrailerUrl(vimeoOnly)).toBeNull();
    expect(firstTrailerUrl(null)).toBeNull();
  });
});

describe("mapOmdbRatings", () => {
  const movie = (overrides: Partial<OmdbMovieDetails>): OmdbMovieDetails =>
    ({
      imdbRating: "8.5",
      Awards: "Won 3 Oscars",
      Ratings: [{ Source: "Rotten Tomatoes", Value: "91%" }],
      ...overrides,
    }) as OmdbMovieDetails;

  it("extracts IMDb and Rotten Tomatoes ratings plus awards", () => {
    const { ratings, awards } = mapOmdbRatings(movie({}));
    expect(ratings).toEqual([
      { source: "IMDb", value: "8.5/10" },
      { source: "Rotten Tomatoes", value: "91%" },
    ]);
    expect(awards).toBe("Won 3 Oscars");
  });

  it("skips an N/A IMDb rating and an N/A awards string", () => {
    const { ratings, awards } = mapOmdbRatings(movie({ imdbRating: "N/A", Awards: "N/A" }));
    expect(ratings).toEqual([{ source: "Rotten Tomatoes", value: "91%" }]);
    expect(awards).toBeNull();
  });

  it("ignores non-Rotten-Tomatoes rating sources", () => {
    const { ratings } = mapOmdbRatings(
      movie({
        imdbRating: "N/A",
        Ratings: [{ Source: "Metacritic", Value: "80/100" }],
      }),
    );
    expect(ratings).toEqual([]);
  });

  it("returns empty ratings and null awards when OMDB data is absent", () => {
    expect(mapOmdbRatings(null)).toEqual({ ratings: [], awards: null });
  });
});

describe("shapeTv season label", () => {
  const tvDetails = (numberOfSeasons: number) =>
    ({
      id: 1,
      name: "Show",
      tagline: "",
      first_air_date: "2020-01-01",
      overview: "",
      episode_run_time: [],
      genres: [],
      poster_path: null,
      backdrop_path: null,
      vote_average: 0,
      vote_count: 0,
      status: "Ended",
      networks: [],
      number_of_seasons: numberOfSeasons,
      number_of_episodes: 10,
      created_by: [],
    }) as unknown as Parameters<typeof shapeTv>[0];

  const shape = (numberOfSeasons: number) =>
    shapeTv(tvDetails(numberOfSeasons), null, null, null, [], null, undefined, [], []);

  it("preformats the season count, singular and plural", () => {
    expect(shape(1).seasonsLabel).toBe("1 season");
    expect(shape(3).seasonsLabel).toBe("3 seasons");
  });

  it("is null when there are no seasons", () => {
    expect(shape(0).seasonsLabel).toBeNull();
  });
});

describe("shapePerson", () => {
  const person = (overrides: Partial<TmdbPersonDetails> = {}): TmdbPersonDetails => ({
    id: 1,
    name: "Test Person",
    biography: "A bio.",
    birthday: "1980-01-01",
    deathday: null,
    place_of_birth: "Somewhere",
    profile_path: "/profile.jpg",
    imdb_id: "nm0000001",
    known_for_department: "Acting",
    ...overrides,
  });

  const credit = (overrides: Partial<TmdbCombinedCredit>): TmdbCombinedCredit => ({
    id: 1,
    media_type: "movie",
    title: "A Movie",
    release_date: "2000-01-01",
    poster_path: "/p.jpg",
    vote_average: 7,
    vote_count: 100,
    credit_id: "c1",
    ...overrides,
  });

  const credits = (
    cast: TmdbCombinedCredit[],
    crew: TmdbCombinedCredit[] = [],
  ): TmdbPersonCombinedCredits => ({ id: 1, cast, crew });

  const sectionFor = (result: ReturnType<typeof shapePerson>, department: string) =>
    result.filmography.find((section) => section.department === department);

  it("carries identity fields through and handles the empty case", () => {
    const result = shapePerson(person(), credits([], []));
    expect(result.name).toBe("Test Person");
    expect(result.profileUrl).toContain("/profile.jpg");
    expect(result.imdbId).toBe("nm0000001");
    expect(result.filmography).toEqual([]);
    expect(result.knownFor).toEqual([]);
  });

  it("groups by role, counts, and sorts each section newest first", () => {
    const result = shapePerson(
      person(),
      credits(
        [
          credit({ id: 10, title: "Old", release_date: "1990-05-01", character: "Hero" }),
          credit({ id: 11, title: "New", release_date: "2010-05-01", character: "Villain" }),
        ],
        [
          credit({
            id: 12,
            title: "Directed",
            release_date: "2005-01-01",
            job: "Director",
            department: "Directing",
          }),
        ],
      ),
    );

    const acting = sectionFor(result, "Acting");
    expect(acting?.count).toBe(2);
    expect(acting?.credits.map((c) => c.title)).toEqual(["New", "Old"]);
    expect(acting?.credits[0].role).toBe("Villain");

    const directing = sectionFor(result, "Directing");
    expect(directing?.count).toBe(1);
    expect(directing?.credits[0].role).toBe("Director");

    // The known-for department leads the section order.
    expect(result.filmography[0].department).toBe("Acting");
  });

  it("handles someone who both acts and directs, de-duping merged jobs within a section", () => {
    const result = shapePerson(
      person(),
      credits(
        [credit({ id: 20, title: "Auteur", release_date: "2015-01-01", character: "Self" })],
        [
          credit({
            id: 20,
            title: "Auteur",
            release_date: "2015-01-01",
            job: "Director",
            department: "Directing",
          }),
          credit({
            id: 20,
            title: "Auteur",
            release_date: "2015-01-01",
            job: "Writer",
            department: "Writing",
          }),
          credit({
            id: 20,
            title: "Auteur",
            release_date: "2015-01-01",
            job: "Screenplay",
            department: "Writing",
          }),
        ],
      ),
    );

    expect(sectionFor(result, "Acting")?.count).toBe(1);
    expect(sectionFor(result, "Directing")?.count).toBe(1);

    // Same title under two Writing jobs collapses to one entry with merged roles.
    const writing = sectionFor(result, "Writing");
    expect(writing?.count).toBe(1);
    expect(writing?.credits[0].role).toBe("Writer, Screenplay");
  });

  it("degrades gracefully for sparse credits (missing date and poster)", () => {
    const result = shapePerson(
      person(),
      credits([
        credit({
          id: 30,
          title: "No Poster",
          release_date: undefined,
          poster_path: null,
          character: "",
        }),
      ]),
    );

    const acting = sectionFor(result, "Acting");
    expect(acting?.count).toBe(1);
    expect(acting?.credits[0].year).toBe("N/A");
    expect(acting?.credits[0].role).toBe("");
    // Poster-less titles still appear in the filmography but not the highlights row.
    expect(result.knownFor).toEqual([]);
  });

  it("selects 'known for' by vote count and caps the highlights row", () => {
    const cast = Array.from({ length: 12 }, (_, index) =>
      credit({
        id: 100 + index,
        title: `Title ${index}`,
        release_date: "2000-01-01",
        vote_count: index * 10,
        poster_path: "/p.jpg",
      }),
    );
    const result = shapePerson(person(), credits(cast));

    expect(result.knownFor).toHaveLength(10);
    // Highest vote count first (id 111 has vote_count 110).
    expect(result.knownFor[0].id).toBe(111);
    const voteOrder = result.knownFor.map((c) => c.id);
    expect(voteOrder).toEqual([...voteOrder].sort((a, b) => b - a));
  });
});

describe("shapeReviews", () => {
  const tmdbReview = (overrides: Partial<TmdbReview>): TmdbReview => ({
    id: "r1",
    author: "Roger",
    author_details: { name: "Roger", username: "roger", avatar_path: null, rating: null },
    content: "A solid watch.",
    created_at: "2020-01-01T00:00:00.000Z",
    updated_at: "2020-01-01T00:00:00.000Z",
    url: "https://www.themoviedb.org/review/r1",
    ...overrides,
  });

  const response = (results: TmdbReview[]): TmdbReviewsResponse => ({
    id: 1,
    page: 1,
    results,
    total_pages: 1,
    total_results: results.length,
  });

  it("maps author, rating, content and url, preserving a present rating", () => {
    const result = shapeReviews(
      response([
        tmdbReview({
          author: "Ebert",
          content: "Loved it.",
          author_details: { name: "Ebert", username: "ebert", avatar_path: null, rating: 9 },
          url: "https://www.themoviedb.org/review/abc",
        }),
      ]),
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: "r1",
      author: "Ebert",
      rating: 9,
      content: "Loved it.",
      url: "https://www.themoviedb.org/review/abc",
    });
  });

  it("returns an empty list when the fetch failed (null)", () => {
    expect(shapeReviews(null)).toEqual([]);
  });

  it("returns an empty list when there are no reviews", () => {
    expect(shapeReviews(response([]))).toEqual([]);
  });

  it("drops reviews whose content is blank", () => {
    const result = shapeReviews(
      response([
        tmdbReview({ id: "blank", content: "   " }),
        tmdbReview({ id: "kept", content: "Worth it." }),
      ]),
    );

    expect(result.map((review) => review.id)).toEqual(["kept"]);
  });

  it("caps the number of reviews so the section cannot dominate the layout", () => {
    const many = Array.from({ length: 12 }, (_, index) =>
      tmdbReview({ id: `r${index}`, content: `Review ${index}` }),
    );

    expect(shapeReviews(response(many)).length).toBeLessThanOrEqual(6);
  });

  it("caps very long review content via core's formatReview", () => {
    const result = shapeReviews(response([tmdbReview({ content: "x".repeat(2000) })]));

    expect(result[0].content.length).toBeLessThan(2000);
  });
});
