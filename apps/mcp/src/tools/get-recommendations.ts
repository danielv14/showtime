import { z } from "zod";
import { defineTool, paginatedResult, failWith } from "./define-tool.js";
import { formatTmdbMovieResult } from "@showtime/core";
import { requireAtLeastOne, resolveMedia } from "./helpers/resolvers.js";

export const getMovieRecommendationsTool = defineTool({
  name: "get_movie_recommendations",
  title: "Get Movie Recommendations",
  description:
    "Get movie recommendations based on a specific movie. Great for finding similar movies you might enjoy. Uses TMDB's recommendation algorithm.",
  schema: {
    tmdbId: z.number().optional().describe("TMDB movie ID (use search_movies to find IDs)"),
    title: z.string().optional().describe("Movie title to get recommendations for"),
    page: z.number().min(1).optional().describe("Page number for pagination (20 results per page)"),
  },
  handler: async ({ tmdbId, title, page }, clients) => {
    const guardError = requireAtLeastOne("getting movie recommendations", {
      tmdbId,
      title,
    });
    if (guardError) return failWith(guardError);

    const media = await resolveMedia(clients, { mediaType: "movie", tmdbId, title });
    const { id: movieId, name: sourceMovieTitle } = media;

    const result = await clients.tmdb.getMovieRecommendations(movieId, { page });

    const formattedResults = result.results.map((movie) =>
      formatTmdbMovieResult(movie, clients.tmdb.getImageUrl, { includeVoteCount: true }),
    );

    return paginatedResult(result, {
      sourceMovie: { tmdbId: movieId, title: sourceMovieTitle },
      recommendations: formattedResults,
    });
  },
});
