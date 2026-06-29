import ky, { type KyInstance } from "ky";
import type {
  TmdbSearchResponse,
  TmdbMovieSearchResult,
  TmdbPersonSearchResult,
  TmdbPersonDetails,
  TmdbPersonMovieCredits,
  TmdbMovieDetails,
  TmdbCredits,
  TmdbWatchProviders,
  TmdbGenre,
  TmdbFindResponse,
  DiscoverMoviesOptions,
  DiscoverTvOptions,
  TmdbTimeWindow,
  TmdbMediaType,
  TmdbTrendingResult,
  TmdbTvSearchResult,
  TmdbTvDetails,
  TmdbCollectionDetails,
  TmdbMultiSearchResult,
  TmdbVideosResponse,
  TmdbReviewsResponse,
} from "./types.js";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

/**
 * Build a public TMDB image URL from an image path and size token. Pure: the
 * image CDN is public, so no API key or client is involved. Returns null for a
 * missing path. `TmdbClient.getImageUrl` delegates here so there is a single
 * implementation that consumers can also import directly.
 */
export const buildTmdbImageUrl = (
  path: string | null | undefined,
  size: string = "w500",
): string | null => {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
};

export class TmdbApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = "TmdbApiError";
  }
}

/** Option names that differ from their TMDB query-parameter name. */
const TMDB_PARAM_NAMES: Record<string, string> = {
  vote_average_gte: "vote_average.gte",
  vote_average_lte: "vote_average.lte",
  vote_count_gte: "vote_count.gte",
  with_runtime_gte: "with_runtime.gte",
  with_runtime_lte: "with_runtime.lte",
};

/**
 * Build a TMDB query-parameter object from an options bag: drop undefined
 * values and rename the dotted params (e.g. `vote_average_gte` ->
 * `vote_average.gte`). Exported for the module's own tests; not part of the
 * client interface.
 */
export const buildSearchParams = (
  options: Record<string, string | number | undefined>,
): Record<string, string | number> => {
  const searchParams: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(options)) {
    if (value === undefined) continue;
    searchParams[TMDB_PARAM_NAMES[key] ?? key] = value;
  }
  return searchParams;
};

/**
 * Build a movie/tv sub-resource endpoint path, e.g. `movie/123/similar` or
 * `tv/123/watch/providers`. Keeps the movie/tv twin methods from drifting
 * apart. Exported for the module's own tests; not part of the client interface.
 */
export const mediaPath = (type: "movie" | "tv", id: number, suffix: string): string =>
  `${type}/${id}/${suffix}`;

export const createTmdbClient = (apiKey: string) => {
  const kyClient: KyInstance = ky.create({
    prefixUrl: TMDB_BASE_URL,
    timeout: 30000,
    retry: {
      limit: 2,
      statusCodes: [408, 429, 500, 502, 503, 504],
    },
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  const getImageUrl = (path: string | null, size: string = "w500"): string | null =>
    buildTmdbImageUrl(path, size);

  const searchMovies = async (
    query: string,
    options?: { page?: number; year?: number },
  ): Promise<TmdbSearchResponse<TmdbMovieSearchResult>> => {
    return kyClient
      .get("search/movie", {
        searchParams: buildSearchParams({
          query,
          page: options?.page,
          year: options?.year,
        }),
      })
      .json<TmdbSearchResponse<TmdbMovieSearchResult>>();
  };

  const searchPerson = async (
    query: string,
    options?: { page?: number },
  ): Promise<TmdbSearchResponse<TmdbPersonSearchResult>> => {
    return kyClient
      .get("search/person", {
        searchParams: buildSearchParams({ query, page: options?.page }),
      })
      .json<TmdbSearchResponse<TmdbPersonSearchResult>>();
  };

  const getPersonDetails = async (personId: number): Promise<TmdbPersonDetails> => {
    return kyClient.get(`person/${personId}`).json<TmdbPersonDetails>();
  };

  const getPersonMovieCredits = async (personId: number): Promise<TmdbPersonMovieCredits> => {
    return kyClient.get(`person/${personId}/movie_credits`).json<TmdbPersonMovieCredits>();
  };

  const getMovieDetails = async (movieId: number): Promise<TmdbMovieDetails> => {
    return kyClient.get(`movie/${movieId}`).json<TmdbMovieDetails>();
  };

  const getMovieByImdbId = async (imdbId: string): Promise<TmdbMovieDetails | null> => {
    const response = await kyClient
      .get(`find/${imdbId}`, {
        searchParams: { external_source: "imdb_id" },
      })
      .json<TmdbFindResponse>();

    const firstResult = response.movie_results[0];
    if (!firstResult) {
      return null;
    }
    // Find endpoint returns partial data, fetch full details
    return getMovieDetails(firstResult.id);
  };

  const getMovieCredits = async (movieId: number): Promise<TmdbCredits> => {
    return kyClient.get(`movie/${movieId}/credits`).json<TmdbCredits>();
  };

  const getTvCredits = async (tvId: number): Promise<TmdbCredits> => {
    return kyClient.get(mediaPath("tv", tvId, "credits")).json<TmdbCredits>();
  };

  const getWatchProviders = async (movieId: number): Promise<TmdbWatchProviders> => {
    return kyClient.get(mediaPath("movie", movieId, "watch/providers")).json<TmdbWatchProviders>();
  };

  const getTvWatchProviders = async (tvId: number): Promise<TmdbWatchProviders> => {
    return kyClient.get(mediaPath("tv", tvId, "watch/providers")).json<TmdbWatchProviders>();
  };

  const discoverMovies = async (
    options: DiscoverMoviesOptions,
  ): Promise<TmdbSearchResponse<TmdbMovieSearchResult>> => {
    return kyClient
      .get("discover/movie", {
        searchParams: buildSearchParams(options as Record<string, string | number | undefined>),
      })
      .json<TmdbSearchResponse<TmdbMovieSearchResult>>();
  };

  const getMovieGenres = async (): Promise<TmdbGenre[]> => {
    return kyClient
      .get("genre/movie/list")
      .json<{ genres: TmdbGenre[] }>()
      .then((response) => response.genres);
  };

  const getTvGenres = async (): Promise<TmdbGenre[]> => {
    return kyClient
      .get("genre/tv/list")
      .json<{ genres: TmdbGenre[] }>()
      .then((response) => response.genres);
  };

  const getTrending = async (
    mediaType: TmdbMediaType,
    timeWindow: TmdbTimeWindow,
    options?: { page?: number },
  ): Promise<TmdbSearchResponse<TmdbTrendingResult>> => {
    return kyClient
      .get(`trending/${mediaType}/${timeWindow}`, {
        searchParams: buildSearchParams({ page: options?.page }),
      })
      .json<TmdbSearchResponse<TmdbTrendingResult>>();
  };

  const getMovieRecommendations = async (
    movieId: number,
    options?: { page?: number },
  ): Promise<TmdbSearchResponse<TmdbMovieSearchResult>> => {
    return kyClient
      .get(mediaPath("movie", movieId, "recommendations"), {
        searchParams: buildSearchParams({ page: options?.page }),
      })
      .json<TmdbSearchResponse<TmdbMovieSearchResult>>();
  };

  // Different algorithm than recommendations - based on genres/keywords
  const getSimilarMovies = async (
    movieId: number,
    options?: { page?: number },
  ): Promise<TmdbSearchResponse<TmdbMovieSearchResult>> => {
    return kyClient
      .get(mediaPath("movie", movieId, "similar"), {
        searchParams: buildSearchParams({ page: options?.page }),
      })
      .json<TmdbSearchResponse<TmdbMovieSearchResult>>();
  };

  const searchTv = async (
    query: string,
    options?: { page?: number; year?: number },
  ): Promise<TmdbSearchResponse<TmdbTvSearchResult>> => {
    return kyClient
      .get("search/tv", {
        searchParams: buildSearchParams({
          query,
          page: options?.page,
          first_air_date_year: options?.year,
        }),
      })
      .json<TmdbSearchResponse<TmdbTvSearchResult>>();
  };

  const getTvDetails = async (tvId: number): Promise<TmdbTvDetails> => {
    return kyClient.get(`tv/${tvId}`).json<TmdbTvDetails>();
  };

  const getTvRecommendations = async (
    tvId: number,
    options?: { page?: number },
  ): Promise<TmdbSearchResponse<TmdbTvSearchResult>> => {
    return kyClient
      .get(mediaPath("tv", tvId, "recommendations"), {
        searchParams: buildSearchParams({ page: options?.page }),
      })
      .json<TmdbSearchResponse<TmdbTvSearchResult>>();
  };

  // Different algorithm than recommendations - based on genres/keywords
  const getSimilarTv = async (
    tvId: number,
    options?: { page?: number },
  ): Promise<TmdbSearchResponse<TmdbTvSearchResult>> => {
    return kyClient
      .get(mediaPath("tv", tvId, "similar"), {
        searchParams: buildSearchParams({ page: options?.page }),
      })
      .json<TmdbSearchResponse<TmdbTvSearchResult>>();
  };

  const getCollection = async (collectionId: number): Promise<TmdbCollectionDetails> => {
    return kyClient.get(`collection/${collectionId}`).json<TmdbCollectionDetails>();
  };

  const discoverTv = async (
    options: DiscoverTvOptions,
  ): Promise<TmdbSearchResponse<TmdbTvSearchResult>> => {
    return kyClient
      .get("discover/tv", {
        searchParams: buildSearchParams(options as Record<string, string | number | undefined>),
      })
      .json<TmdbSearchResponse<TmdbTvSearchResult>>();
  };

  const multiSearch = async (
    query: string,
    options?: { page?: number },
  ): Promise<TmdbSearchResponse<TmdbMultiSearchResult>> => {
    return kyClient
      .get("search/multi", {
        searchParams: buildSearchParams({ query, page: options?.page }),
      })
      .json<TmdbSearchResponse<TmdbMultiSearchResult>>();
  };

  const getMovieVideos = async (movieId: number): Promise<TmdbVideosResponse> => {
    return kyClient.get(mediaPath("movie", movieId, "videos")).json<TmdbVideosResponse>();
  };

  const getTvVideos = async (tvId: number): Promise<TmdbVideosResponse> => {
    return kyClient.get(mediaPath("tv", tvId, "videos")).json<TmdbVideosResponse>();
  };

  const getNowPlayingMovies = async (options?: {
    page?: number;
    region?: string;
  }): Promise<TmdbSearchResponse<TmdbMovieSearchResult>> => {
    return kyClient
      .get("movie/now_playing", {
        searchParams: buildSearchParams({
          page: options?.page,
          region: options?.region,
        }),
      })
      .json<TmdbSearchResponse<TmdbMovieSearchResult>>();
  };

  const getUpcomingMovies = async (options?: {
    page?: number;
    region?: string;
  }): Promise<TmdbSearchResponse<TmdbMovieSearchResult>> => {
    return kyClient
      .get("movie/upcoming", {
        searchParams: buildSearchParams({
          page: options?.page,
          region: options?.region,
        }),
      })
      .json<TmdbSearchResponse<TmdbMovieSearchResult>>();
  };

  const getAiringTodayTv = async (options?: {
    page?: number;
  }): Promise<TmdbSearchResponse<TmdbTvSearchResult>> => {
    return kyClient
      .get("tv/airing_today", {
        searchParams: buildSearchParams({ page: options?.page }),
      })
      .json<TmdbSearchResponse<TmdbTvSearchResult>>();
  };

  const getOnTheAirTv = async (options?: {
    page?: number;
  }): Promise<TmdbSearchResponse<TmdbTvSearchResult>> => {
    return kyClient
      .get("tv/on_the_air", {
        searchParams: buildSearchParams({ page: options?.page }),
      })
      .json<TmdbSearchResponse<TmdbTvSearchResult>>();
  };

  const getMovieReviews = async (
    movieId: number,
    options?: { page?: number },
  ): Promise<TmdbReviewsResponse> => {
    return kyClient
      .get(mediaPath("movie", movieId, "reviews"), {
        searchParams: buildSearchParams({ page: options?.page }),
      })
      .json<TmdbReviewsResponse>();
  };

  const getTvReviews = async (
    tvId: number,
    options?: { page?: number },
  ): Promise<TmdbReviewsResponse> => {
    return kyClient
      .get(mediaPath("tv", tvId, "reviews"), {
        searchParams: buildSearchParams({ page: options?.page }),
      })
      .json<TmdbReviewsResponse>();
  };

  return {
    searchMovies,
    searchPerson,
    getPersonDetails,
    getPersonMovieCredits,
    getMovieDetails,
    getMovieByImdbId,
    getMovieCredits,
    getTvCredits,
    getWatchProviders,
    getTvWatchProviders,
    discoverMovies,
    discoverTv,
    getMovieGenres,
    getTvGenres,
    getTrending,
    getMovieRecommendations,
    getSimilarMovies,
    searchTv,
    getTvDetails,
    getTvRecommendations,
    getSimilarTv,
    getCollection,
    multiSearch,
    getMovieVideos,
    getTvVideos,
    getNowPlayingMovies,
    getUpcomingMovies,
    getAiringTodayTv,
    getOnTheAirTv,
    getMovieReviews,
    getTvReviews,
    getImageUrl,
  };
};

export type TmdbClient = ReturnType<typeof createTmdbClient>;
