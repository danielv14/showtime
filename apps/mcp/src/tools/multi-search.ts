import { z } from "zod";
import type { TmdbMultiSearchResult } from "@showtime/core";
import { defineTool, paginatedResult } from "./define-tool.js";
import { truncateText, extractYear } from "@showtime/core";
import { NA } from "@showtime/core";

const formatMultiSearchResult = (
  result: TmdbMultiSearchResult,
  getImageUrl: (path: string | null, size?: string) => string | null
) => {
  const base = {
    tmdbId: result.id,
    mediaType: result.media_type,
  };

  if (result.media_type === "movie") {
    return {
      ...base,
      title: result.title,
      year: extractYear(result.release_date),
      releaseDate: result.release_date || NA,
      overview: truncateText(result.overview || "", 200),
      tmdbRating: result.vote_average,
      posterUrl: getImageUrl(result.poster_path ?? null, "w342"),
    };
  }

  if (result.media_type === "tv") {
    return {
      ...base,
      name: result.name,
      year: extractYear(result.first_air_date),
      firstAirDate: result.first_air_date || NA,
      overview: truncateText(result.overview || "", 200),
      tmdbRating: result.vote_average,
      posterUrl: getImageUrl(result.poster_path ?? null, "w342"),
    };
  }

  // Person
  return {
    ...base,
    name: result.name,
    knownFor: result.known_for_department,
    profileImageUrl: getImageUrl(result.profile_path ?? null, "w185"),
    knownForTitles: result.known_for?.slice(0, 3).map((m) => m.title).filter(Boolean),
  };
};

export const multiSearchTool = defineTool({
  name: "multi_search",
  title: "Multi Search",
  description:
    "Search for movies, TV shows, and people in a single request. Great for general queries when you don't know the exact type of content.",
  schema: {
    query: z
      .string()
      .describe("Search query (movie title, TV show name, or person name)"),
    page: z
      .number()
      .min(1)
      .optional()
      .describe("Page number for pagination (20 results per page)"),
  },
  handler: async ({ query, page }, { tmdb }) => {
    const result = await tmdb.multiSearch(query, { page });

    const formattedResults = result.results.map((r) =>
      formatMultiSearchResult(r, tmdb.getImageUrl)
    );

    // Group results by type for easier consumption
    const movies = formattedResults.filter((r) => r.mediaType === "movie");
    const tvShows = formattedResults.filter((r) => r.mediaType === "tv");
    const people = formattedResults.filter((r) => r.mediaType === "person");

    return paginatedResult(result, {
      query,
      results: formattedResults,
      byType: {
        movies: movies.length > 0 ? movies : undefined,
        tvShows: tvShows.length > 0 ? tvShows : undefined,
        people: people.length > 0 ? people : undefined,
      },
    });
  },
});
