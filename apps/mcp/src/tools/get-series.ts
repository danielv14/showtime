import { z } from "zod";
import type { OmdbSeriesDetails } from "@showtime/core";
import { defineTool, failWith } from "./define-tool.js";
import { requireAtLeastOne } from "./helpers/resolvers.js";

export const getSeriesTool = defineTool({
  name: "get_series",
  title: "Get TV Series Details",
  description:
    "Get detailed information about a specific TV series by IMDb ID or title. Returns full details including plot, ratings, cast, total seasons, and more.",
  schema: {
    imdbId: z.string().optional().describe("IMDb ID of the series (e.g., 'tt0903747')"),
    title: z.string().optional().describe("Exact title of the series to look up"),
    year: z.string().optional().describe("Year of release (helps disambiguate titles)"),
    plot: z.enum(["short", "full"]).optional().describe("Plot length: 'short' (default) or 'full'"),
  },
  handler: async ({ imdbId, title, year, plot }, { omdb }) => {
    const guardError = requireAtLeastOne("getting series details", {
      imdbId,
      title,
    });
    if (guardError) return failWith(guardError);

    const result = imdbId
      ? await omdb.getById({ imdbId, plot })
      : await omdb.getByTitle({ title: title!, type: "series", year, plot });

    if (result.Type !== "series") {
      throw new Error(
        `The result is a ${result.Type}, not a series. Use the appropriate tool for ${result.Type}.`,
      );
    }

    const seriesResult = result as OmdbSeriesDetails;

    return {
      title: seriesResult.Title,
      year: seriesResult.Year,
      rated: seriesResult.Rated,
      released: seriesResult.Released,
      runtime: seriesResult.Runtime,
      genre: seriesResult.Genre,
      director: seriesResult.Director,
      writer: seriesResult.Writer,
      actors: seriesResult.Actors,
      plot: seriesResult.Plot,
      language: seriesResult.Language,
      country: seriesResult.Country,
      awards: seriesResult.Awards,
      ratings: seriesResult.Ratings,
      metascore: seriesResult.Metascore,
      imdbRating: seriesResult.imdbRating,
      imdbVotes: seriesResult.imdbVotes,
      imdbId: seriesResult.imdbID,
      totalSeasons: seriesResult.totalSeasons,
    };
  },
});
