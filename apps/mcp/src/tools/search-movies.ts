import { z } from "zod";
import { defineTool, paginatedResult } from "./define-tool.js";
import { formatTmdbMovieResult } from "@showtime/core";
import { pageParam } from "./helpers/params.js";

export const searchMoviesTool = defineTool({
  name: "search_movies",
  title: "Search Movies",
  description:
    "Search for movies by title using TMDB's advanced search. Returns a list of matching movies with basic info including TMDB ID, title, year, overview, and poster.",
  schema: {
    query: z.string().describe("Movie title to search for"),
    year: z.number().optional().describe("Filter results by release year (e.g., 2023)"),
    page: pageParam,
  },
  handler: async ({ query, year, page }, { tmdb }) => {
    const result = await tmdb.searchMovies(query, { page, year });

    const formattedResults = result.results.map((movie) =>
      formatTmdbMovieResult(movie, tmdb.getImageUrl),
    );

    return paginatedResult(result, { results: formattedResults });
  },
});
