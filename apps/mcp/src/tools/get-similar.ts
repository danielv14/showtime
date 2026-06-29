import { z } from "zod";
import { defineTool, paginatedResult } from "./define-tool.js";
import { formatTmdbMovieResult, formatTmdbTvResult } from "@showtime/core";
import { resolveMedia, atLeastOneMessage } from "./helpers/resolvers.js";

export const getSimilarTool = defineTool({
  name: "get_similar",
  title: "Get Similar",
  description:
    "Get similar movies or TV shows based on genres and keywords. Different from recommendations - this uses genre/keyword matching rather than TMDB's recommendation algorithm.",
  schema: {
    movieId: z.number().optional().describe("TMDB movie ID (use search_movies to find IDs)"),
    tvId: z.number().optional().describe("TMDB TV series ID (use search_series to find IDs)"),
    page: z.number().min(1).optional().describe("Page number for pagination (20 results per page)"),
  },
  handler: async ({ movieId, tvId, page }, clients) => {
    // This tool's identifiers are movieId/tvId, so it guards with their names
    // here rather than relying on resolveMedia's tmdbId/imdbId/title message.
    if (movieId === undefined && tvId === undefined) {
      throw new Error(atLeastOneMessage(["movieId", "tvId"]));
    }

    const media = await resolveMedia(
      clients,
      movieId !== undefined
        ? { mediaType: "movie", tmdbId: movieId }
        : { mediaType: "tv", tmdbId: tvId },
    );

    // The source's genres are not part of ResolvedMedia, so fetch details for them.
    if (media.type === "movie") {
      const [similarResult, movieDetails] = await Promise.all([
        clients.tmdb.getSimilarMovies(media.id, { page }),
        clients.tmdb.getMovieDetails(media.id),
      ]);

      const formattedResults = similarResult.results.map((movie) =>
        formatTmdbMovieResult(movie, clients.tmdb.getImageUrl, {
          includeVoteCount: true,
        }),
      );

      return paginatedResult(similarResult, {
        mediaType: "movie",
        basedOn: {
          tmdbId: media.id,
          title: media.name,
          genres: movieDetails.genres.map((g) => g.name),
        },
        similar: formattedResults,
      });
    }

    const [similarResult, tvDetails] = await Promise.all([
      clients.tmdb.getSimilarTv(media.id, { page }),
      clients.tmdb.getTvDetails(media.id),
    ]);

    const formattedResults = similarResult.results.map((show) =>
      formatTmdbTvResult(show, clients.tmdb.getImageUrl, {
        includeVoteCount: true,
      }),
    );

    return paginatedResult(similarResult, {
      mediaType: "tv",
      basedOn: {
        tmdbId: media.id,
        name: media.name,
        genres: tvDetails.genres.map((g) => g.name),
      },
      similar: formattedResults,
    });
  },
});
