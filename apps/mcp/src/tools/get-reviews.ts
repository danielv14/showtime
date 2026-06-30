import { z } from "zod";
import { defineTool } from "./define-tool.js";
import { formatReview } from "@showtime/core";
import { resolveMovieOrTv } from "./helpers/resolvers.js";

export const getReviewsTool = defineTool({
  name: "get_reviews",
  title: "Get Reviews",
  description: "Get user reviews for movies or TV shows from the TMDB community.",
  schema: {
    movieId: z.number().optional().describe("TMDB movie ID (use search_movies to find IDs)"),
    tvId: z.number().optional().describe("TMDB TV series ID (use search_series to find IDs)"),
    page: z.number().min(1).optional().describe("Page number for pagination"),
  },
  handler: async ({ movieId, tvId, page }, clients) => {
    const media = await resolveMovieOrTv(clients, { movieId, tvId });

    const reviewsResponse =
      media.type === "movie"
        ? await clients.tmdb.getMovieReviews(media.id, { page })
        : await clients.tmdb.getTvReviews(media.id, { page });

    return {
      mediaType: media.type,
      mediaTitle: media.name,
      mediaId: media.id,
      reviews: reviewsResponse.results.map(formatReview),
      totalReviews: reviewsResponse.total_results,
      page: reviewsResponse.page,
      totalPages: reviewsResponse.total_pages,
    };
  },
});
