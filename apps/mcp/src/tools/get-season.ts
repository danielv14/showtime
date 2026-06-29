import { z } from "zod";
import { defineTool } from "./define-tool.js";
import { formatOmdbEpisode } from "@showtime/core";

export const getSeasonTool = defineTool({
  name: "get_season",
  title: "Get Season Episodes",
  description:
    "Get all episodes in a specific season of a TV series. Returns episode titles, ratings, and air dates for the entire season in a single request.",
  schema: {
    seriesId: z
      .string()
      .describe("IMDb ID of the TV series (e.g., 'tt0411008' for Lost)"),
    season: z.number().min(1).describe("Season number"),
  },
  handler: async ({ seriesId, season }, { omdb }) => {
    const result = await omdb.getSeason({ seriesId, season });

    return {
      title: result.Title,
      season: result.Season,
      totalSeasons: result.totalSeasons,
      episodes: result.Episodes.map(formatOmdbEpisode),
    };
  },
});
