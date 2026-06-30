import {
  createHttpClient,
  HttpRequestError,
  type HttpClient,
  type HttpRequestOptions,
} from "../helpers/http.js";
import type {
  TmdbSearchResponse,
  TmdbMovieSearchResult,
  TmdbPersonSearchResult,
  TmdbPersonDetails,
  TmdbPersonMovieCredits,
  TmdbPersonCombinedCredits,
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
  TmdbEpisodeDetails,
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
    public endpoint?: string,
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

/**
 * Build the production HTTP adapter for TMDB: the shared retry/timeout policy
 * plus TMDB's bearer auth and JSON content-type headers. Exposed so the default
 * adapter and any caller-supplied one share one definition of "a TMDB request".
 */
export const createTmdbHttpClient = (apiKey: string): HttpClient =>
  createHttpClient({
    prefixUrl: TMDB_BASE_URL,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

export const createTmdbClient = (
  apiKey: string,
  httpClient: HttpClient = createTmdbHttpClient(apiKey),
) => {
  /**
   * Run a TMDB GET and parse the JSON body, translating the seam's transport
   * errors into a `TmdbApiError` that carries the status code and endpoint. The
   * adapter throws an `HttpRequestError` for non-2xx responses (e.g. a 401 from
   * a bad/expired key or a 404) and timeouts, which would otherwise reach
   * consumers as an opaque error. Error translation lives here, in the client,
   * so a fake adapter can simulate a transport failure and still surface a
   * `TmdbApiError`.
   */
  const request = async <T>(endpoint: string, options?: HttpRequestOptions): Promise<T> => {
    try {
      return await httpClient.get<T>(endpoint, options);
    } catch (error) {
      if (error instanceof HttpRequestError) {
        if (error.isTimeout) {
          throw new TmdbApiError(`TMDB request to ${endpoint} timed out`, undefined, endpoint);
        }
        throw new TmdbApiError(
          `TMDB request to ${endpoint} failed with status ${error.statusCode}`,
          error.statusCode,
          endpoint,
        );
      }
      throw error;
    }
  };

  const getImageUrl = (path: string | null, size: string = "w500"): string | null =>
    buildTmdbImageUrl(path, size);

  const searchMovies = async (
    query: string,
    options?: { page?: number; year?: number },
  ): Promise<TmdbSearchResponse<TmdbMovieSearchResult>> => {
    return request<TmdbSearchResponse<TmdbMovieSearchResult>>("search/movie", {
      searchParams: buildSearchParams({
        query,
        page: options?.page,
        year: options?.year,
      }),
    });
  };

  const searchPerson = async (
    query: string,
    options?: { page?: number },
  ): Promise<TmdbSearchResponse<TmdbPersonSearchResult>> => {
    return request<TmdbSearchResponse<TmdbPersonSearchResult>>("search/person", {
      searchParams: buildSearchParams({ query, page: options?.page }),
    });
  };

  const getPersonDetails = async (personId: number): Promise<TmdbPersonDetails> => {
    return request<TmdbPersonDetails>(`person/${personId}`);
  };

  const getPersonMovieCredits = async (personId: number): Promise<TmdbPersonMovieCredits> => {
    return request<TmdbPersonMovieCredits>(`person/${personId}/movie_credits`);
  };

  const getPersonCombinedCredits = async (personId: number): Promise<TmdbPersonCombinedCredits> => {
    return request<TmdbPersonCombinedCredits>(`person/${personId}/combined_credits`);
  };

  const getMovieDetails = async (movieId: number): Promise<TmdbMovieDetails> => {
    return request<TmdbMovieDetails>(`movie/${movieId}`);
  };

  const getMovieByImdbId = async (imdbId: string): Promise<TmdbMovieDetails | null> => {
    const response = await request<TmdbFindResponse>(`find/${imdbId}`, {
      searchParams: { external_source: "imdb_id" },
    });

    const firstResult = response.movie_results[0];
    if (!firstResult) {
      return null;
    }
    // Find endpoint returns partial data, fetch full details
    return getMovieDetails(firstResult.id);
  };

  const getMovieCredits = async (movieId: number): Promise<TmdbCredits> => {
    return request<TmdbCredits>(`movie/${movieId}/credits`);
  };

  const getTvCredits = async (tvId: number): Promise<TmdbCredits> => {
    return request<TmdbCredits>(mediaPath("tv", tvId, "credits"));
  };

  const getWatchProviders = async (movieId: number): Promise<TmdbWatchProviders> => {
    return request<TmdbWatchProviders>(mediaPath("movie", movieId, "watch/providers"));
  };

  const getTvWatchProviders = async (tvId: number): Promise<TmdbWatchProviders> => {
    return request<TmdbWatchProviders>(mediaPath("tv", tvId, "watch/providers"));
  };

  const discoverMovies = async (
    options: DiscoverMoviesOptions,
  ): Promise<TmdbSearchResponse<TmdbMovieSearchResult>> => {
    return request<TmdbSearchResponse<TmdbMovieSearchResult>>("discover/movie", {
      searchParams: buildSearchParams(options as Record<string, string | number | undefined>),
    });
  };

  const getMovieGenres = async (): Promise<TmdbGenre[]> => {
    const response = await request<{ genres: TmdbGenre[] }>("genre/movie/list");
    return response.genres;
  };

  const getTvGenres = async (): Promise<TmdbGenre[]> => {
    const response = await request<{ genres: TmdbGenre[] }>("genre/tv/list");
    return response.genres;
  };

  const getTrending = async (
    mediaType: TmdbMediaType,
    timeWindow: TmdbTimeWindow,
    options?: { page?: number },
  ): Promise<TmdbSearchResponse<TmdbTrendingResult>> => {
    return request<TmdbSearchResponse<TmdbTrendingResult>>(`trending/${mediaType}/${timeWindow}`, {
      searchParams: buildSearchParams({ page: options?.page }),
    });
  };

  const getMovieRecommendations = async (
    movieId: number,
    options?: { page?: number },
  ): Promise<TmdbSearchResponse<TmdbMovieSearchResult>> => {
    return request<TmdbSearchResponse<TmdbMovieSearchResult>>(
      mediaPath("movie", movieId, "recommendations"),
      {
        searchParams: buildSearchParams({ page: options?.page }),
      },
    );
  };

  // Different algorithm than recommendations - based on genres/keywords
  const getSimilarMovies = async (
    movieId: number,
    options?: { page?: number },
  ): Promise<TmdbSearchResponse<TmdbMovieSearchResult>> => {
    return request<TmdbSearchResponse<TmdbMovieSearchResult>>(
      mediaPath("movie", movieId, "similar"),
      {
        searchParams: buildSearchParams({ page: options?.page }),
      },
    );
  };

  const searchTv = async (
    query: string,
    options?: { page?: number; year?: number },
  ): Promise<TmdbSearchResponse<TmdbTvSearchResult>> => {
    return request<TmdbSearchResponse<TmdbTvSearchResult>>("search/tv", {
      searchParams: buildSearchParams({
        query,
        page: options?.page,
        first_air_date_year: options?.year,
      }),
    });
  };

  const getTvDetails = async (tvId: number): Promise<TmdbTvDetails> => {
    return request<TmdbTvDetails>(`tv/${tvId}`);
  };

  const getTvRecommendations = async (
    tvId: number,
    options?: { page?: number },
  ): Promise<TmdbSearchResponse<TmdbTvSearchResult>> => {
    return request<TmdbSearchResponse<TmdbTvSearchResult>>(
      mediaPath("tv", tvId, "recommendations"),
      {
        searchParams: buildSearchParams({ page: options?.page }),
      },
    );
  };

  // Different algorithm than recommendations - based on genres/keywords
  const getSimilarTv = async (
    tvId: number,
    options?: { page?: number },
  ): Promise<TmdbSearchResponse<TmdbTvSearchResult>> => {
    return request<TmdbSearchResponse<TmdbTvSearchResult>>(mediaPath("tv", tvId, "similar"), {
      searchParams: buildSearchParams({ page: options?.page }),
    });
  };

  const getCollection = async (collectionId: number): Promise<TmdbCollectionDetails> => {
    return request<TmdbCollectionDetails>(`collection/${collectionId}`);
  };

  const discoverTv = async (
    options: DiscoverTvOptions,
  ): Promise<TmdbSearchResponse<TmdbTvSearchResult>> => {
    return request<TmdbSearchResponse<TmdbTvSearchResult>>("discover/tv", {
      searchParams: buildSearchParams(options as Record<string, string | number | undefined>),
    });
  };

  const multiSearch = async (
    query: string,
    options?: { page?: number },
  ): Promise<TmdbSearchResponse<TmdbMultiSearchResult>> => {
    return request<TmdbSearchResponse<TmdbMultiSearchResult>>("search/multi", {
      searchParams: buildSearchParams({ query, page: options?.page }),
    });
  };

  const getMovieVideos = async (movieId: number): Promise<TmdbVideosResponse> => {
    return request<TmdbVideosResponse>(mediaPath("movie", movieId, "videos"));
  };

  const getTvVideos = async (tvId: number): Promise<TmdbVideosResponse> => {
    return request<TmdbVideosResponse>(mediaPath("tv", tvId, "videos"));
  };

  const getTvEpisodeDetails = async (
    tvId: number,
    seasonNumber: number,
    episodeNumber: number,
  ): Promise<TmdbEpisodeDetails> => {
    return request<TmdbEpisodeDetails>(
      `tv/${tvId}/season/${seasonNumber}/episode/${episodeNumber}`,
    );
  };

  const getNowPlayingMovies = async (options?: {
    page?: number;
    region?: string;
  }): Promise<TmdbSearchResponse<TmdbMovieSearchResult>> => {
    return request<TmdbSearchResponse<TmdbMovieSearchResult>>("movie/now_playing", {
      searchParams: buildSearchParams({
        page: options?.page,
        region: options?.region,
      }),
    });
  };

  const getUpcomingMovies = async (options?: {
    page?: number;
    region?: string;
  }): Promise<TmdbSearchResponse<TmdbMovieSearchResult>> => {
    return request<TmdbSearchResponse<TmdbMovieSearchResult>>("movie/upcoming", {
      searchParams: buildSearchParams({
        page: options?.page,
        region: options?.region,
      }),
    });
  };

  const getAiringTodayTv = async (options?: {
    page?: number;
  }): Promise<TmdbSearchResponse<TmdbTvSearchResult>> => {
    return request<TmdbSearchResponse<TmdbTvSearchResult>>("tv/airing_today", {
      searchParams: buildSearchParams({ page: options?.page }),
    });
  };

  const getOnTheAirTv = async (options?: {
    page?: number;
  }): Promise<TmdbSearchResponse<TmdbTvSearchResult>> => {
    return request<TmdbSearchResponse<TmdbTvSearchResult>>("tv/on_the_air", {
      searchParams: buildSearchParams({ page: options?.page }),
    });
  };

  const getMovieReviews = async (
    movieId: number,
    options?: { page?: number },
  ): Promise<TmdbReviewsResponse> => {
    return request<TmdbReviewsResponse>(mediaPath("movie", movieId, "reviews"), {
      searchParams: buildSearchParams({ page: options?.page }),
    });
  };

  const getTvReviews = async (
    tvId: number,
    options?: { page?: number },
  ): Promise<TmdbReviewsResponse> => {
    return request<TmdbReviewsResponse>(mediaPath("tv", tvId, "reviews"), {
      searchParams: buildSearchParams({ page: options?.page }),
    });
  };

  return {
    searchMovies,
    searchPerson,
    getPersonDetails,
    getPersonMovieCredits,
    getPersonCombinedCredits,
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
    getTvEpisodeDetails,
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
