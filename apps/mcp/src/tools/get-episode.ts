import { z } from "zod";
import { defineTool } from "./define-tool.js";

export const getEpisodeTool = defineTool({
  name: "get_episode",
  title: "Get Episode Details",
  description:
    "Get detailed information about a specific TV episode. Requires the series IMDb ID and season/episode numbers.",
  schema: {
    seriesId: z.string().describe("IMDb ID of the TV series (e.g., 'tt0903747' for Breaking Bad)"),
    season: z.number().min(1).describe("Season number"),
    episode: z.number().min(1).describe("Episode number"),
  },
  handler: async ({ seriesId, season, episode }, { omdb }) => {
    const result = await omdb.getEpisode({ seriesId, season, episode });

    return {
      title: result.Title,
      year: result.Year,
      rated: result.Rated,
      released: result.Released,
      season: result.Season,
      episode: result.Episode,
      runtime: result.Runtime,
      genre: result.Genre,
      director: result.Director,
      writer: result.Writer,
      actors: result.Actors,
      plot: result.Plot,
      language: result.Language,
      country: result.Country,
      awards: result.Awards,
      ratings: result.Ratings,
      metascore: result.Metascore,
      imdbRating: result.imdbRating,
      imdbVotes: result.imdbVotes,
      imdbId: result.imdbID,
      seriesId: result.seriesID,
    };
  },
});
