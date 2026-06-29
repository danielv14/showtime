import ky, { type KyInstance } from "ky";
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

export const createOmdbClient = (apiKey: string) => {
  const kyClient: KyInstance = ky.create({
    prefixUrl: OMDB_BASE_URL,
    timeout: 30000,
    retry: {
      limit: 2,
      statusCodes: [408, 429, 500, 502, 503, 504],
    },
  });

  const handleResponse = <T>(response: T | OmdbErrorResponse): T => {
    if (
      "Response" in (response as object) &&
      (response as OmdbErrorResponse).Response === "False"
    ) {
      throw new OmdbApiError((response as OmdbErrorResponse).Error);
    }
    return response as T;
  };

  const search = async (
    type: "movie" | "series",
    options: SearchOptions
  ): Promise<OmdbSearchResponse> => {
    const searchParams: Record<string, string | number> = {
      apikey: apiKey,
      s: options.query,
      type,
    };

    if (options.year) searchParams.y = options.year;
    if (options.page) searchParams.page = options.page;

    const response = await kyClient
      .get("", { searchParams })
      .json<OmdbSearchResponse | OmdbErrorResponse>();

    return handleResponse(response);
  };

  const searchMovies = (options: SearchOptions) => search("movie", options);
  const searchSeries = (options: SearchOptions) => search("series", options);

  const getById = async (
    options: GetByIdOptions
  ): Promise<OmdbMovieDetails | OmdbSeriesDetails | OmdbEpisodeDetails> => {
    const searchParams: Record<string, string> = {
      apikey: apiKey,
      i: options.imdbId,
      plot: options.plot || "short",
    };

    const response = await kyClient
      .get("", { searchParams })
      .json<
        | OmdbMovieDetails
        | OmdbSeriesDetails
        | OmdbEpisodeDetails
        | OmdbErrorResponse
      >();

    return handleResponse(response);
  };

  const getByTitle = async (
    options: GetByTitleOptions
  ): Promise<OmdbMovieDetails | OmdbSeriesDetails> => {
    const searchParams: Record<string, string> = {
      apikey: apiKey,
      t: options.title,
      plot: options.plot || "short",
    };

    if (options.type) searchParams.type = options.type;
    if (options.year) searchParams.y = options.year;

    const response = await kyClient
      .get("", { searchParams })
      .json<OmdbMovieDetails | OmdbSeriesDetails | OmdbErrorResponse>();

    return handleResponse(response);
  };

  const getEpisode = async (
    options: GetEpisodeOptions
  ): Promise<OmdbEpisodeDetails> => {
    const searchParams: Record<string, string | number> = {
      apikey: apiKey,
      i: options.seriesId,
      Season: options.season,
      Episode: options.episode,
    };

    const response = await kyClient
      .get("", { searchParams })
      .json<OmdbEpisodeDetails | OmdbErrorResponse>();

    return handleResponse(response);
  };

  const getSeason = async (
    options: GetSeasonOptions
  ): Promise<OmdbSeasonResponse> => {
    const searchParams: Record<string, string | number> = {
      apikey: apiKey,
      i: options.seriesId,
      Season: options.season,
    };

    const response = await kyClient
      .get("", { searchParams })
      .json<OmdbSeasonResponse | OmdbErrorResponse>();

    return handleResponse(response);
  };

  const getAllEpisodes = async (
    options: GetAllEpisodesOptions
  ): Promise<OmdbSeasonResponse[]> => {
    const series = (await getById({
      imdbId: options.seriesId,
    })) as OmdbSeriesDetails;
    const totalSeasons = parseInt(series.totalSeasons, 10);

    const seasonPromises = Array.from({ length: totalSeasons }, (_, index) =>
      getSeason({ seriesId: options.seriesId, season: index + 1 })
    );

    return Promise.all(seasonPromises);
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
