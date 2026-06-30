import { defineTool, paginatedResult } from "./define-tool.js";
import { formatTmdbMovieResult } from "@showtime/core";
import { pageParam, regionParam } from "./helpers/params.js";

export const getUpcomingTool = defineTool({
  name: "get_upcoming",
  title: "Get Upcoming Movies",
  description:
    "Get upcoming movie releases. Results are region-specific and sorted by release date.",
  schema: {
    region: regionParam,
    page: pageParam,
  },
  handler: async ({ region = "US", page }, { tmdb }) => {
    const result = await tmdb.getUpcomingMovies({ page, region });

    const formattedResults = result.results.map((movie) =>
      formatTmdbMovieResult(movie, tmdb.getImageUrl, { includeVoteCount: true }),
    );

    return paginatedResult(result, { results: formattedResults, region });
  },
});
