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

/**
 * Why an OMDB call failed.
 *
 * - `not_found`: OMDB definitively answering that it has no result for the query
 *   (a wire-level `Response: "False"`). A permanent miss, so consumers can cache
 *   it for the full window and stay quiet.
 * - `rate_limited`: OMDB's daily request quota is exhausted. OMDB signals this
 *   with a 401 (it does not use 429) and a `Request limit reached!` body. It is
 *   temporary and recovers when the quota resets, so consumers can present it as
 *   "temporarily unavailable" rather than an outage.
 * - `auth`: the API key is missing or invalid (also a 401, but with an
 *   `Invalid API key!` / `No API key provided.` body). A configuration problem
 *   that will not recover on its own, so it is worth logging loudly.
 * - `transient`: an upstream failure where OMDB never gave a real answer
 *   (timeout, 5xx, network). Worth shortening any cache and surfacing in logs,
 *   since it may recover.
 */
export type OmdbErrorKind = "not_found" | "rate_limited" | "auth" | "transient";

export class OmdbApiError extends Error {
  readonly kind: OmdbErrorKind;

  constructor(message: string, kind: OmdbErrorKind) {
    super(message);
    this.name = "OmdbApiError";
    this.kind = kind;
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

/** OMDB's body text when the daily request quota is exhausted. */
const RATE_LIMIT_PATTERN = /request limit reached/i;

/**
 * Read OMDB's `Error` message out of a raw error-response body. OMDB returns its
 * failure reason as JSON (e.g. `{"Response":"False","Error":"Request limit
 * reached!"}`) even on a 401, so the body is what distinguishes a quota
 * exhaustion from a bad key. Returns undefined when there is no body or it does
 * not parse.
 */
const parseOmdbErrorMessage = (body: string | undefined): string | undefined => {
  if (!body) return undefined;
  try {
    const parsed = JSON.parse(body) as { Error?: unknown };
    return typeof parsed.Error === "string" ? parsed.Error : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Map a seam-level transport failure onto an `OmdbApiError` with the right kind.
 * A timeout or 5xx is `transient`. A 401 is OMDB's catch-all for auth problems
 * AND for daily-quota exhaustion (it does not use 429), so the response body is
 * what tells them apart: a `Request limit reached!` body is `rate_limited`
 * (expected, recovers when the quota resets), anything else is `auth` (a missing
 * or invalid key, which needs the key fixed and will not recover on its own).
 */
const toOmdbError = (error: HttpRequestError): OmdbApiError => {
  if (error.isTimeout) return new OmdbApiError("OMDB request timed out", "transient");
  if (error.statusCode === 401) {
    const reason = parseOmdbErrorMessage(error.responseBody);
    if (reason && RATE_LIMIT_PATTERN.test(reason)) {
      return new OmdbApiError(`OMDB daily request limit reached: ${reason}`, "rate_limited");
    }
    return new OmdbApiError(
      reason ? `OMDB authentication failed: ${reason}` : "OMDB authentication failed (status 401)",
      "auth",
    );
  }
  return new OmdbApiError(`OMDB request failed with status ${error.statusCode}`, "transient");
};

export const createOmdbClient = (
  apiKey: string,
  httpClient: HttpClient = createOmdbHttpClient(),
) => {
  const handleResponse = <T>(response: T): T => {
    const maybeError = response as Partial<OmdbErrorResponse>;
    if (maybeError.Response === "False") {
      // A wire-level `Response: "False"` is OMDB saying it has no result for
      // this query, so it is a permanent miss rather than a transient fault.
      throw new OmdbApiError(maybeError.Error ?? "", "not_found");
    }
    return response;
  };

  /**
   * Issue an OMDB GET (every endpoint is the base URL with query params). The
   * `apikey` is injected here so no caller can forget it.
   */
  const request = async <T>(searchParams: Record<string, string | number>): Promise<T> => {
    try {
      const response = await httpClient.get<T>("", {
        searchParams: { apikey: apiKey, ...searchParams },
      });
      return handleResponse(response);
    } catch (error) {
      // Translate the seam's transport failure into the right `OmdbApiError`
      // kind (rate limit vs auth vs other transient fault), reading OMDB's 401
      // body where it encodes the real reason. See `toOmdbError`.
      if (error instanceof HttpRequestError) {
        throw toOmdbError(error);
      }
      throw error;
    }
  };

  const search = async (
    type: "movie" | "series",
    options: SearchOptions,
  ): Promise<OmdbSearchResponse> => {
    const searchParams: Record<string, string | number> = {
      s: options.query,
      type,
    };

    if (options.year) searchParams.y = options.year;
    if (options.page) searchParams.page = options.page;

    return request<OmdbSearchResponse>(searchParams);
  };

  const searchMovies = (options: SearchOptions) => search("movie", options);
  const searchSeries = (options: SearchOptions) => search("series", options);

  const getById = async (
    options: GetByIdOptions,
  ): Promise<OmdbMovieDetails | OmdbSeriesDetails | OmdbEpisodeDetails> => {
    const searchParams: Record<string, string> = {
      i: options.imdbId,
      plot: options.plot || "short",
    };

    return request<OmdbMovieDetails | OmdbSeriesDetails | OmdbEpisodeDetails>(searchParams);
  };

  const getByTitle = async (
    options: GetByTitleOptions,
  ): Promise<OmdbMovieDetails | OmdbSeriesDetails> => {
    const searchParams: Record<string, string> = {
      t: options.title,
      plot: options.plot || "short",
    };

    if (options.type) searchParams.type = options.type;
    if (options.year) searchParams.y = options.year;

    return request<OmdbMovieDetails | OmdbSeriesDetails>(searchParams);
  };

  const getEpisode = async (options: GetEpisodeOptions): Promise<OmdbEpisodeDetails> => {
    const searchParams: Record<string, string | number> = {
      i: options.seriesId,
      Season: options.season,
      Episode: options.episode,
    };

    return request<OmdbEpisodeDetails>(searchParams);
  };

  const getSeason = async (options: GetSeasonOptions): Promise<OmdbSeasonResponse> => {
    const searchParams: Record<string, string | number> = {
      i: options.seriesId,
      Season: options.season,
    };

    return request<OmdbSeasonResponse>(searchParams);
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
