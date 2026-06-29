import { createHttpClient, HttpRequestError, type HttpClient } from "../helpers/http.js";
import type {
  OmdbSearchResponse,
  OmdbErrorResponse,
  OmdbMovieDetails,
  OmdbSeriesDetails,
  OmdbEpisodeDetails,
  OmdbSeasonResponse,
  PlotLength,
  ContentType,
} from "./types.js";

const OMDB_BASE_URL = "https://www.omdbapi.com/";

export class OmdbApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OmdbApiError";
  }
}

export interface SearchOptions {
  query: string;
  year?: string;
  page?: number;
}

export interface GetByIdOptions {
  imdbId: string;
  plot?: PlotLength;
}

export interface GetByTitleOptions {
  title: string;
  type?: ContentType;
  year?: string;
  plot?: PlotLength;
}

export interface GetEpisodeOptions {
  seriesId: string;
  season: number;
  episode: number;
}

export interface GetSeasonOptions {
  seriesId: string;
  season: number;
}

export interface GetAllEpisodesOptions {
  seriesId: string;
}

/**
 * Parse OMDB's `totalSeasons` string into a season count. OMDB returns "N/A"
 * for absent fields, which would otherwise become NaN; treat any non-positive
 * or non-numeric value as 0 seasons.
 *
 * Exported for tests.
 */
export const parseTotalSeasons = (totalSeasons: string | undefined): number => {
  const parsed = parseInt(totalSeasons ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
};

/**
 * Build the production HTTP adapter for OMDB: the shared retry/timeout policy
 * over OMDB's base URL. OMDB authenticates via an `apikey` query param (added
 * per request by the client), so no auth headers are needed here.
 */
export const createOmdbHttpClient = (): HttpClient =>
  createHttpClient({ prefixUrl: OMDB_BASE_URL });

export const createOmdbClient = (
  apiKey: string,
  httpClient: HttpClient = createOmdbHttpClient(),
) => {
  const handleResponse = <T>(response: T | OmdbErrorResponse): T => {
    if (
      "Response" in (response as object) &&
      (response as OmdbErrorResponse).Response === "False"
    ) {
      throw new OmdbApiError((response as OmdbErrorResponse).Error);
    }
    return response as T;
  };

  /**
   * Issue an OMDB GET (every endpoint is the base URL with query params) and
   * translate the seam's transport failure into an `OmdbApiError`, so the
   * package's "failures throw OmdbApiError" convention holds for outages and
   * timeouts as it already does for OMDB's wire-level `Response: "False"`.
   */
  const request = async <T>(searchParams: Record<string, string | number>): Promise<T> => {
    try {
      return await httpClient.get<T>("", { searchParams });
    } catch (error) {
      if (error instanceof HttpRequestError) {
        throw new OmdbApiError(
          error.isTimeout
            ? "OMDB request timed out"
            : `OMDB request failed with status ${error.statusCode}`,
        );
      }
      throw error;
    }
  };

  const search = async (
    type: "movie" | "series",
    options: SearchOptions,
  ): Promise<OmdbSearchResponse> => {
    const searchParams: Record<string, string | number> = {
      apikey: apiKey,
      s: options.query,
      type,
    };

    if (options.year) searchParams.y = options.year;
    if (options.page) searchParams.page = options.page;

    const response = await request<OmdbSearchResponse | OmdbErrorResponse>(searchParams);

    return handleResponse(response);
  };

  const searchMovies = (options: SearchOptions) => search("movie", options);
  const searchSeries = (options: SearchOptions) => search("series", options);

  const getById = async (
    options: GetByIdOptions,
  ): Promise<OmdbMovieDetails | OmdbSeriesDetails | OmdbEpisodeDetails> => {
    const searchParams: Record<string, string> = {
      apikey: apiKey,
      i: options.imdbId,
      plot: options.plot || "short",
    };

    const response = await request<
      OmdbMovieDetails | OmdbSeriesDetails | OmdbEpisodeDetails | OmdbErrorResponse
    >(searchParams);

    return handleResponse(response);
  };

  const getByTitle = async (
    options: GetByTitleOptions,
  ): Promise<OmdbMovieDetails | OmdbSeriesDetails> => {
    const searchParams: Record<string, string> = {
      apikey: apiKey,
      t: options.title,
      plot: options.plot || "short",
    };

    if (options.type) searchParams.type = options.type;
    if (options.year) searchParams.y = options.year;

    const response = await request<OmdbMovieDetails | OmdbSeriesDetails | OmdbErrorResponse>(
      searchParams,
    );

    return handleResponse(response);
  };

  const getEpisode = async (options: GetEpisodeOptions): Promise<OmdbEpisodeDetails> => {
    const searchParams: Record<string, string | number> = {
      apikey: apiKey,
      i: options.seriesId,
      Season: options.season,
      Episode: options.episode,
    };

    const response = await request<OmdbEpisodeDetails | OmdbErrorResponse>(searchParams);

    return handleResponse(response);
  };

  const getSeason = async (options: GetSeasonOptions): Promise<OmdbSeasonResponse> => {
    const searchParams: Record<string, string | number> = {
      apikey: apiKey,
      i: options.seriesId,
      Season: options.season,
    };

    const response = await request<OmdbSeasonResponse | OmdbErrorResponse>(searchParams);

    return handleResponse(response);
  };

  const getAllEpisodes = async (options: GetAllEpisodesOptions): Promise<OmdbSeasonResponse[]> => {
    const details = await getById({
      imdbId: options.seriesId,
    });
    if (details.Type !== "series") {
      return [];
    }
    const totalSeasons = parseTotalSeasons(details.totalSeasons);

    // Some series have gaps where a season fetch 404s; skip those rather than
    // failing the whole series.
    const seasonPromises = Array.from({ length: totalSeasons }, (_, index) =>
      getSeason({ seriesId: options.seriesId, season: index + 1 }).catch(() => null),
    );

    const seasons = await Promise.all(seasonPromises);
    return seasons.filter((season): season is OmdbSeasonResponse => season !== null);
  };

  return {
    searchMovies,
    searchSeries,
    getById,
    getByTitle,
    getEpisode,
    getSeason,
    getAllEpisodes,
  };
};

export type OmdbClient = ReturnType<typeof createOmdbClient>;
