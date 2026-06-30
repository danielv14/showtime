import { defineTool, paginatedResult } from "./define-tool.js";
import { formatTmdbTvResult } from "@showtime/core";
import { pageParam } from "./helpers/params.js";

export const getOnTheAirTool = defineTool({
  name: "get_on_the_air",
  title: "Get TV On The Air",
  description:
    "Get TV series that are currently on the air (in production with episodes airing over the next several days). Distinct from get_airing_today, which only covers shows with an episode airing today.",
  schema: {
    page: pageParam,
  },
  handler: async ({ page }, { tmdb }) => {
    const result = await tmdb.getOnTheAirTv({ page });

    const formattedResults = result.results.map((show) =>
      formatTmdbTvResult(show, tmdb.getImageUrl, { includeVoteCount: true }),
    );

    return paginatedResult(result, { results: formattedResults });
  },
});
