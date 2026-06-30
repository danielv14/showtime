import { z } from "zod";
import { defineTool, paginatedResult } from "./define-tool.js";
import { formatTmdbTvResult } from "@showtime/core";
import { TV_GENRE_MAP, getGenreId } from "@showtime/core";
import { pageParam } from "./helpers/params.js";

export const discoverTvTool = defineTool({
  name: "discover_tv",
  title: "Discover TV Shows",
  description:
    "Discover TV shows using advanced filters like genre, year, rating, network, and language. Great for finding TV series that match specific criteria.",
  schema: {
    year: z.number().optional().describe("Filter by first air date year (e.g., 2023)"),
    genre: z
      .string()
      .optional()
      .describe("Genre name (e.g., 'drama', 'comedy', 'sci-fi', 'crime', 'documentary')"),
    minRating: z.number().min(0).max(10).optional().describe("Minimum TMDB rating (0-10)"),
    language: z
      .string()
      .optional()
      .describe("Original language code (e.g., 'en', 'ko', 'ja', 'es')"),
    sortBy: z
      .enum([
        "popularity.desc",
        "popularity.asc",
        "first_air_date.desc",
        "first_air_date.asc",
        "vote_average.desc",
        "vote_average.asc",
      ])
      .optional()
      .describe("Sort order (default: popularity.desc)"),
    page: pageParam,
  },
  handler: async ({ year, genre, minRating, language, sortBy, page }, { tmdb }) => {
    let genreId: string | undefined;
    if (genre) {
      const mappedId = getGenreId(genre, TV_GENRE_MAP);
      if (!mappedId) {
        throw new Error(
          `Unknown genre '${genre}'. Available genres: ${Object.keys(TV_GENRE_MAP).join(", ")}`,
        );
      }
      genreId = mappedId.toString();
    }

    const result = await tmdb.discoverTv({
      page,
      sort_by: sortBy,
      first_air_date_year: year,
      with_genres: genreId,
      vote_average_gte: minRating,
      vote_count_gte: minRating ? 50 : undefined,
      with_original_language: language,
    });

    const formattedResults = result.results.map((show) =>
      formatTmdbTvResult(show, tmdb.getImageUrl, { includeVoteCount: true }),
    );

    return paginatedResult(result, {
      results: formattedResults,
      filters: {
        year,
        genre,
        minRating,
        language,
        sortBy: sortBy || "popularity.desc",
      },
    });
  },
});
