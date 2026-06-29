import { z } from "zod";
import { defineTool, paginatedResult } from "./define-tool.js";
import { extractYear, truncateText } from "@showtime/core";
import { NA } from "@showtime/core";

export const getTrendingTool = defineTool({
  name: "get_trending",
  title: "Get Trending",
  description:
    "Get trending movies and TV shows. Great for discovering what's popular right now.",
  schema: {
    mediaType: z
      .enum(["movie", "tv", "all"])
      .optional()
      .describe("Type of content: 'movie', 'tv', or 'all' (default: 'all')"),
    timeWindow: z
      .enum(["day", "week"])
      .optional()
      .describe("Time window: 'day' or 'week' (default: 'week')"),
    page: z
      .number()
      .min(1)
      .optional()
      .describe("Page number for pagination (20 results per page)"),
  },
  handler: async (
    { mediaType = "all", timeWindow = "week", page },
    { tmdb }
  ) => {
    const result = await tmdb.getTrending(mediaType, timeWindow, { page });

    const formattedResults = result.results.map((item) => {
      const isMovie = item.media_type === "movie";
      const title = isMovie ? item.title : item.name;
      const releaseDate = isMovie ? item.release_date : item.first_air_date;

      return {
        tmdbId: item.id,
        mediaType: item.media_type,
        title: title || "Unknown",
        year: extractYear(releaseDate),
        releaseDate: releaseDate || NA,
        overview: truncateText(item.overview || "", 200),
        tmdbRating: item.vote_average,
        voteCount: item.vote_count,
        posterUrl: tmdb.getImageUrl(item.poster_path, "w342"),
      };
    });

    return paginatedResult(result, {
      results: formattedResults,
      filters: { mediaType, timeWindow },
    });
  },
});
