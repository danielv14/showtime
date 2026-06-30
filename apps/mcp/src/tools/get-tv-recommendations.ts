import { z } from "zod";
import { defineTool, paginatedResult } from "./define-tool.js";
import { formatTmdbTvResult } from "@showtime/core";
import { resolveMedia } from "./helpers/resolvers.js";
import { pageParam } from "./helpers/params.js";

export const getTvRecommendationsTool = defineTool({
  name: "get_tv_recommendations",
  title: "Get TV Recommendations",
  description:
    "Get TV series recommendations based on a specific show. Great for finding similar shows you might enjoy.",
  schema: {
    tmdbId: z.number().optional().describe("TMDB TV series ID"),
    title: z.string().optional().describe("TV series title to get recommendations for"),
    page: pageParam,
  },
  handler: async ({ tmdbId, title, page }, clients) => {
    const media = await resolveMedia(clients, { mediaType: "tv", tmdbId, title });
    const { id: tvId, name: sourceShowTitle } = media;

    const result = await clients.tmdb.getTvRecommendations(tvId, { page });

    const formattedResults = result.results.map((show) =>
      formatTmdbTvResult(show, clients.tmdb.getImageUrl, { includeVoteCount: true }),
    );

    return paginatedResult(result, {
      sourceShow: { tmdbId: tvId, title: sourceShowTitle },
      recommendations: formattedResults,
    });
  },
});
