import { z } from "zod";
import { defineTool, paginatedResult } from "./define-tool.js";
import { formatTmdbMovieResult } from "@showtime/core";

export const getUpcomingTool = defineTool({
  name: "get_upcoming",
  title: "Get Upcoming Movies",
  description:
    "Get upcoming movie releases. Results are region-specific and sorted by release date.",
  schema: {
    region: z
      .string()
      .optional()
      .describe(
        "ISO 3166-1 country code for regional results (e.g., 'US', 'GB', 'SE'). Defaults to US."
      ),
    page: z
      .number()
      .min(1)
      .optional()
      .describe("Page number for pagination (20 results per page)"),
  },
  handler: async ({ region = "US", page }, { tmdb }) => {
    const result = await tmdb.getUpcomingMovies({ page, region });

    const formattedResults = result.results.map((movie) =>
      formatTmdbMovieResult(movie, tmdb.getImageUrl, { includeVoteCount: true })
    );

    return paginatedResult(result, { results: formattedResults, region });
  },
});
