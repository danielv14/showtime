import { z } from "zod";
import { defineTool, paginatedResult } from "./define-tool.js";
import { formatTmdbMovieResult } from "@showtime/core";
import { resolveMedia } from "./helpers/resolvers.js";
import { pageParam } from "./helpers/params.js";

export const getMovieRecommendationsTool = defineTool({
  name: "get_movie_recommendations",
  title: "Get Movie Recommendations",
  description:
    "Get movie recommendations based on a specific movie. Great for finding similar movies you might enjoy. Uses TMDB's recommendation algorithm.",
  schema: {
    tmdbId: z.number().optional().describe("TMDB movie ID (use search_movies to find IDs)"),
    title: z.string().optional().describe("Movie title to get recommendations for"),
    page: pageParam,
  },
  handler: async ({ tmdbId, title, page }, clients) => {
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
