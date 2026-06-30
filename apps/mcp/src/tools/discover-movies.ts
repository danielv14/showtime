import { z } from "zod";
import { defineTool, paginatedResult } from "./define-tool.js";
import { formatTmdbMovieResult } from "@showtime/core";
import { MOVIE_GENRE_MAP, getGenreId } from "@showtime/core";
import { pageParam } from "./helpers/params.js";

export const discoverMoviesTool = defineTool({
  name: "discover_movies",
  title: "Discover Movies",
  description:
    "Discover movies using advanced filters like genre, year, rating, director, actor, and language. Great for finding movies that match specific criteria.",
  schema: {
    year: z.number().optional().describe("Filter by release year (e.g., 2023)"),
    genre: z
      .string()
      .optional()
      .describe("Genre name (e.g., 'action', 'comedy', 'sci-fi', 'thriller', 'drama')"),
    minRating: z.number().min(0).max(10).optional().describe("Minimum TMDB rating (0-10)"),
    directorId: z
      .number()
      .optional()
      .describe("TMDB person ID for director (use search_person to find IDs)"),
    actorId: z
      .number()
      .optional()
      .describe("TMDB person ID for actor (use search_person to find IDs)"),
    language: z
      .string()
      .optional()
      .describe("Original language code (e.g., 'en', 'fr', 'ko', 'ja', 'es')"),
    sortBy: z
      .enum([
        "popularity.desc",
        "popularity.asc",
        "release_date.desc",
        "release_date.asc",
        "vote_average.desc",
        "vote_average.asc",
        "revenue.desc",
        "revenue.asc",
      ])
      .optional()
      .describe("Sort order (default: popularity.desc)"),
    page: pageParam,
  },
  handler: async (
    { year, genre, minRating, directorId, actorId, language, sortBy, page },
    { tmdb },
  ) => {
    let genreId: string | undefined;
    if (genre) {
      const mappedId = getGenreId(genre, MOVIE_GENRE_MAP);
      if (!mappedId) {
        throw new Error(
          `Unknown genre '${genre}'. Available genres: ${Object.keys(MOVIE_GENRE_MAP).join(", ")}`,
        );
      }
      genreId = mappedId.toString();
    }

    const peopleIds: number[] = [];
    if (directorId) peopleIds.push(directorId);
    if (actorId) peopleIds.push(actorId);
    const withPeople = peopleIds.length > 0 ? peopleIds.join(",") : undefined;

    const result = await tmdb.discoverMovies({
      page,
      sort_by: sortBy,
      primary_release_year: year,
      with_genres: genreId,
      with_people: withPeople,
      vote_average_gte: minRating,
      vote_count_gte: minRating ? 50 : undefined,
      with_original_language: language,
    });

    const formattedResults = result.results.map((movie) =>
      formatTmdbMovieResult(movie, tmdb.getImageUrl, { includeVoteCount: true }),
    );

    return paginatedResult(result, {
      results: formattedResults,
      filters: {
        year,
        genre,
        minRating,
        directorId,
        actorId,
        language,
        sortBy: sortBy || "popularity.desc",
      },
    });
  },
});
