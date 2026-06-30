import { defineTool, paginatedResult } from "./define-tool.js";
import { formatTmdbTvResult } from "@showtime/core";
import { pageParam } from "./helpers/params.js";

export const getAiringTodayTool = defineTool({
  name: "get_airing_today",
  title: "Get TV Airing Today",
  description: "Get TV shows that have episodes airing today. Great for finding what's new on TV.",
  schema: {
    page: pageParam,
  },
  handler: async ({ page }, { tmdb }) => {
    const result = await tmdb.getAiringTodayTv({ page });

    const formattedResults = result.results.map((show) =>
      formatTmdbTvResult(show, tmdb.getImageUrl, { includeVoteCount: true }),
    );

    return paginatedResult(result, { results: formattedResults });
  },
});
