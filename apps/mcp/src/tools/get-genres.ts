import { z } from "zod";
import { defineTool } from "./define-tool.js";

export const getGenresTool = defineTool({
  name: "get_genres",
  title: "Get Genres",
  description:
    "Get the list of valid genre names and ids for movies and/or TV. Use this to discover the genre values accepted by the discover_movies and discover_tv filters.",
  schema: {
    mediaType: z
      .enum(["movie", "tv", "all"])
      .optional()
      .describe("Which genre list to return: 'movie', 'tv', or 'all' (default: 'all')"),
  },
  handler: async ({ mediaType = "all" }, { tmdb }) => {
    const includeMovie = mediaType === "movie" || mediaType === "all";
    const includeTv = mediaType === "tv" || mediaType === "all";

    const [movieGenres, tvGenres] = await Promise.all([
      includeMovie ? tmdb.getMovieGenres() : Promise.resolve(undefined),
      includeTv ? tmdb.getTvGenres() : Promise.resolve(undefined),
    ]);

    return {
      mediaType,
      ...(movieGenres && { movieGenres }),
      ...(tvGenres && { tvGenres }),
    };
  },
});
