import { z } from "zod";
import { defineTool, paginatedResult, failWith } from "./define-tool.js";
import { formatTmdbTvResult } from "@showtime/core";
import { requireAtLeastOne, resolveMedia } from "./helpers/resolvers.js";

export const getTvRecommendationsTool = defineTool({
  name: "get_tv_recommendations",
  title: "Get TV Recommendations",
  description:
    "Get TV series recommendations based on a specific show. Great for finding similar shows you might enjoy.",
  schema: {
    tmdbId: z.number().optional().describe("TMDB TV series ID"),
    title: z.string().optional().describe("TV series title to get recommendations for"),
    page: z.number().min(1).optional().describe("Page number for pagination (20 results per page)"),
  },
  handler: async ({ tmdbId, title, page }, clients) => {
    const guardError = requireAtLeastOne("getting TV recommendations", {
      tmdbId,
      title,
    });
    if (guardError) return failWith(guardError);

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
