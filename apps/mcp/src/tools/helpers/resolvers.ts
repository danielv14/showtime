import type { TmdbClient, TmdbMovieDetails } from "@showtime/core";
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
 * title, throwing on failure. Used by {@link resolveMedia} so the resolution
 * sequence lives in one place.
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
 * failure. Used by {@link resolveMedia}.
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

/**
 * Resolve a movie or TV series from a `movieId`/`tvId` pair into a uniform
 * {@link ResolvedMedia}. These tools' identifiers are movieId/tvId, so this
 * owns the guard with their names rather than relying on resolveMedia's
 * tmdbId/imdbId/title message. Throws on failure.
 */
export const resolveMovieOrTv = async (
  clients: ToolClients,
  input: { movieId?: number; tvId?: number },
): Promise<ResolvedMedia> => {
  const { movieId, tvId } = input;

  if (movieId === undefined && tvId === undefined) {
    throw new Error(atLeastOneMessage(["movieId", "tvId"]));
  }

  return resolveMedia(
    clients,
    movieId !== undefined
      ? { mediaType: "movie", tmdbId: movieId }
      : { mediaType: "tv", tmdbId: tvId },
  );
};

/**
 * A movie resolved across sources: whichever ids we could establish, plus the
 * TMDB details when a lookup already fetched them (so callers reuse rather than
 * refetch).
 */
export interface CrossSourceMovie {
  imdbId?: string;
  tmdbId?: number;
  tmdbDetails?: TmdbMovieDetails;
}

/**
 * Resolve a movie to both an imdbId and a tmdbId, starting from any of tmdbId /
 * imdbId / title. Crosses ids via TMDB: a tmdbId yields its imdb_id, and a title
 * is searched then its first hit's details fetched. Returns any TMDB details it
 * had to fetch so the caller can reuse them. Establishing the OMDB-side id and
 * validating the result's type stay with the caller ({@link getMovieTool}), which
 * needs the OMDB payload for both. Assumes at least one identifier is present.
 */
export const resolveMovieAcrossSources = async (
  tmdb: TmdbClient,
  input: { imdbId?: string; tmdbId?: number; title?: string; year?: string },
): Promise<CrossSourceMovie> => {
  const { imdbId, tmdbId, title, year } = input;
  let finalImdbId: string | undefined = imdbId;
  let finalTmdbId: number | undefined = tmdbId;
  let tmdbDetails: TmdbMovieDetails | undefined;

  if (tmdbId && !imdbId) {
    tmdbDetails = await tmdb.getMovieDetails(tmdbId);
    finalImdbId = tmdbDetails.imdb_id || undefined;
    finalTmdbId = tmdbDetails.id;
  }

  if (!finalImdbId && !finalTmdbId && title) {
    const searchResult = await tmdb.searchMovies(title, {
      year: year ? parseInt(year, 10) : undefined,
    });
    const firstResult = searchResult.results[0];
    if (firstResult) {
      finalTmdbId = firstResult.id;
      tmdbDetails = await tmdb.getMovieDetails(finalTmdbId);
      finalImdbId = tmdbDetails.imdb_id || undefined;
    }
  }

  return { imdbId: finalImdbId, tmdbId: finalTmdbId, tmdbDetails };
};
