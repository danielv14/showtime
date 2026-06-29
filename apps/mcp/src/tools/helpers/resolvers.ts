import type { TmdbClient } from "@showtime/core";
import type { ToolClients } from "../define-tool.js";
import { createErrorResponse } from "./response.js";

/** The shared "at least one of …" message, so guards never drift in wording. */
export const atLeastOneMessage = (fields: string[]): string =>
  `At least one of ${fields.map((f) => `'${f}'`).join(", ")} must be provided`;

export const requireAtLeastOne = (
  context: string,
  fields: Record<string, unknown>,
): ReturnType<typeof createErrorResponse> | null => {
  const hasValue = Object.values(fields).some((v) => v !== undefined && v !== null);
  if (!hasValue) {
    return createErrorResponse(context, new Error(atLeastOneMessage(Object.keys(fields))));
  }
  return null;
};

/**
 * Core movie resolution. Resolves a movie id+title from tmdbId, imdbId, or
 * title, throwing on failure. Shared by {@link resolveMedia} and the legacy
 * {@link resolveMovieId} adapter so the resolution sequence lives in one place.
 */
const resolveMovieRef = async (
  tmdbClient: TmdbClient,
  options: { tmdbId?: number; imdbId?: string; title?: string },
): Promise<{ id: number; title: string }> => {
  const { tmdbId, imdbId, title } = options;

  if (tmdbId) {
    const details = await tmdbClient.getMovieDetails(tmdbId);
    return { id: details.id, title: details.title };
  }

  if (imdbId) {
    const movie = await tmdbClient.getMovieByImdbId(imdbId);
    if (!movie) {
      throw new Error(`Movie not found for IMDb ID: ${imdbId}`);
    }
    return { id: movie.id, title: movie.title };
  }

  if (title) {
    const searchResult = await tmdbClient.searchMovies(title);
    const firstResult = searchResult.results[0];
    if (!firstResult) {
      throw new Error(`No movies found matching title: ${title}`);
    }
    return { id: firstResult.id, title: firstResult.title };
  }

  throw new Error("Could not determine movie ID");
};

/**
 * Core TV resolution. Resolves a TV id+name from tmdbId or title, throwing on
 * failure. Shared by {@link resolveMedia} and the legacy {@link resolveTvId}.
 */
const resolveTvRef = async (
  tmdbClient: TmdbClient,
  options: { tmdbId?: number; title?: string },
): Promise<{ id: number; name: string }> => {
  const { tmdbId, title } = options;

  if (tmdbId) {
    const details = await tmdbClient.getTvDetails(tmdbId);
    return { id: details.id, name: details.name };
  }

  if (title) {
    const searchResult = await tmdbClient.searchTv(title);
    const firstResult = searchResult.results[0];
    if (!firstResult) {
      throw new Error(`No TV series found matching title: ${title}`);
    }
    return { id: firstResult.id, name: firstResult.name };
  }

  throw new Error("Could not determine TV series ID");
};

/** A movie or TV series resolved to one uniform shape. */
export type ResolvedMedia = { type: "movie" | "tv"; id: number; name: string };

/**
 * The media seam: resolve a movie or TV series from any supported identifier
 * into a uniform {@link ResolvedMedia}. Owns the at-least-one-identifier guard
 * and the rule that IMDb-id lookup is movie-only. Throws on failure (the tool
 * runner shapes the error response).
 */
export const resolveMedia = async (
  clients: ToolClients,
  input: {
    mediaType?: "movie" | "tv";
    tmdbId?: number;
    imdbId?: string;
    title?: string;
  },
): Promise<ResolvedMedia> => {
  const { mediaType = "movie", tmdbId, imdbId, title } = input;

  if (tmdbId === undefined && imdbId === undefined && title === undefined) {
    throw new Error(atLeastOneMessage(["tmdbId", "imdbId", "title"]));
  }

  if (mediaType === "tv") {
    if (imdbId && !tmdbId && !title) {
      throw new Error(
        "IMDb ID lookup is only supported for movies. For TV series, provide a tmdbId or title.",
      );
    }
    const tv = await resolveTvRef(clients.tmdb, { tmdbId, title });
    return { type: "tv", id: tv.id, name: tv.name };
  }

  const movie = await resolveMovieRef(clients.tmdb, { tmdbId, imdbId, title });
  return { type: "movie", id: movie.id, name: movie.title };
};

/** Result type for movie ID resolution */
export type ResolvedMovie = { id: number; title: string };

/** Result type for TV ID resolution */
export type ResolvedTv = { id: number; name: string };

/**
 * Resolve a movie ID from various inputs (tmdbId, imdbId, or title).
 * Returns the resolved movie ID and title, or a structured error response.
 * Retained for tools not (yet) migrated to {@link resolveMedia}.
 */
export const resolveMovieId = async (
  tmdbClient: TmdbClient,
  context: string,
  options: { tmdbId?: number; imdbId?: string; title?: string },
): Promise<
  | { success: true; movie: ResolvedMovie }
  | { success: false; error: ReturnType<typeof createErrorResponse> }
> => {
  try {
    const movie = await resolveMovieRef(tmdbClient, options);
    return { success: true, movie };
  } catch (error) {
    return { success: false, error: createErrorResponse(context, error) };
  }
};

/**
 * Resolve a TV series ID from various inputs (tmdbId or title).
 * Returns the resolved TV ID and name, or a structured error response.
 * Retained for tools not (yet) migrated to {@link resolveMedia}.
 */
export const resolveTvId = async (
  tmdbClient: TmdbClient,
  context: string,
  options: { tmdbId?: number; title?: string },
): Promise<
  | { success: true; tv: ResolvedTv }
  | { success: false; error: ReturnType<typeof createErrorResponse> }
> => {
  try {
    const tv = await resolveTvRef(tmdbClient, options);
    return { success: true, tv };
  } catch (error) {
    return { success: false, error: createErrorResponse(context, error) };
  }
};
