import { z } from "zod";
import { defineTool, omdbPaginatedResult } from "./define-tool.js";
import { OMDB_RESULTS_PER_PAGE, OmdbApiError } from "@showtime/core";

export const searchSeriesTool = defineTool({
  name: "search_series",
  title: "Search TV Series",
  description:
    "Search for TV series by title. Returns a list of matching series with basic info (title, year, IMDb ID).",
  schema: {
    query: z.string().describe("TV series title to search for"),
    year: z.string().optional().describe("Filter results by release year (e.g., '2023')"),
    page: z
      .number()
      .min(1)
      .max(100)
      .optional()
      .describe("Page number for pagination (1-100, 10 results per page)"),
  },
  handler: async ({ query, year, page }, { omdb }) => {
    const currentPage = page ?? 1;

    let result;
    try {
      result = await omdb.searchSeries({ query, year, page });
    } catch (error) {
      // OMDB answers a zero-hit search with a wire-level "no result", which core
      // raises as `not_found`. Return an empty page so this matches the TMDB
      // search tools (which return `results: []`) rather than erroring.
      if (error instanceof OmdbApiError && error.kind === "not_found") {
        return omdbPaginatedResult(
          { page: currentPage, totalResults: 0, resultsPerPage: OMDB_RESULTS_PER_PAGE },
          { results: [] },
        );
      }
      throw error;
    }

    const formattedResults = result.Search.map((series) => ({
      title: series.Title,
      year: series.Year,
      imdbId: series.imdbID,
      type: series.Type,
    }));

    // OMDB's totalResults is a numeric string, but guard against a missing/`N/A`
    // value so a NaN never reaches the pagination math.
    const totalResults = Number.parseInt(result.totalResults, 10);
    return omdbPaginatedResult(
      {
        page: currentPage,
        totalResults: Number.isFinite(totalResults) ? totalResults : formattedResults.length,
        resultsPerPage: OMDB_RESULTS_PER_PAGE,
      },
      { results: formattedResults },
    );
  },
});
