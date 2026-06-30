import { z } from "zod";
import { defineTool, paginatedResult } from "./define-tool.js";
import { formatTmdbMovieResult, formatTmdbTvResult } from "@showtime/core";
import { resolveMovieOrTv } from "./helpers/resolvers.js";
import { pageParam } from "./helpers/params.js";

export const getSimilarTool = defineTool({
  name: "get_similar",
  title: "Get Similar",
  description:
    "Get similar movies or TV shows based on genres and keywords. Different from recommendations - this uses genre/keyword matching rather than TMDB's recommendation algorithm.",
  schema: {
    movieId: z.number().optional().describe("TMDB movie ID (use search_movies to find IDs)"),
    tvId: z.number().optional().describe("TMDB TV series ID (use search_series to find IDs)"),
    page: pageParam,
  },
  handler: async ({ movieId, tvId, page }, clients) => {
    const media = await resolveMovieOrTv(clients, { movieId, tvId });

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
