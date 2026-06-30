import { defineTool, paginatedResult } from "./define-tool.js";
import { formatTmdbMovieResult } from "@showtime/core";
import { pageParam, regionParam } from "./helpers/params.js";

export const getNowPlayingTool = defineTool({
  name: "get_now_playing",
  title: "Get Now Playing Movies",
  description: "Get movies currently playing in theaters. Results are region-specific.",
  schema: {
    region: regionParam,
    page: pageParam,
  },
  handler: async ({ region = "US", page }, { tmdb }) => {
    const result = await tmdb.getNowPlayingMovies({ page, region });

    const formattedResults = result.results.map((movie) =>
      formatTmdbMovieResult(movie, tmdb.getImageUrl, { includeVoteCount: true }),
    );

    return paginatedResult(result, { results: formattedResults, region });
  },
});
