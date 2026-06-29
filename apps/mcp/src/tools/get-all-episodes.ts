import { z } from "zod";
import { defineTool } from "./define-tool.js";
import { formatOmdbEpisode } from "@showtime/core";

export const getAllEpisodesTool = defineTool({
  name: "get_all_episodes",
  title: "Get All Episodes",
  description:
    "Get all episodes across all seasons of a TV series. Returns episode titles, ratings, and air dates for the entire series. Useful for analyzing rating trends over time.",
  schema: {
    seriesId: z
      .string()
      .describe("IMDb ID of the TV series (e.g., 'tt0411008' for Lost)"),
  },
  handler: async ({ seriesId }, { omdb }) => {
    const seasons = await omdb.getAllEpisodes({ seriesId });

    return {
      title: seasons[0]?.Title || "Unknown",
      totalSeasons: seasons.length,
      seasons: seasons.map((season) => ({
        season: season.Season,
        episodeCount: season.Episodes.length,
        episodes: season.Episodes.map(formatOmdbEpisode),
      })),
    };
  },
});
