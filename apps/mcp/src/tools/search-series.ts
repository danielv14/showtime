import { z } from "zod";
import { defineTool, omdbPaginatedResult } from "./define-tool.js";
import { OMDB_RESULTS_PER_PAGE } from "@showtime/core";

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
    const result = await omdb.searchSeries({ query, year, page });

    const formattedResults = result.Search.map((series) => ({
      title: series.Title,
      year: series.Year,
      imdbId: series.imdbID,
      type: series.Type,
    }));

    return omdbPaginatedResult(
      {
        page: page ?? 1,
        totalResults: parseInt(result.totalResults, 10),
        resultsPerPage: OMDB_RESULTS_PER_PAGE,
      },
      { results: formattedResults },
    );
  },
});
