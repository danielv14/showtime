import { z } from "zod";
import { defineTool, failWith } from "./define-tool.js";
import { crewByJob, crewWriters } from "@showtime/core";
import { NA } from "@showtime/core";
import type { TmdbMovieDetails } from "@showtime/core";
import { requireAtLeastOne } from "./helpers/resolvers.js";

export const getMovieTool = defineTool({
  name: "get_movie",
  title: "Get Movie Details",
  description:
    "Get detailed information about a specific movie. Combines OMDB data (ratings, box office, awards) with TMDB data (cast, crew, images). Provide either imdbId, tmdbId, or title.",
  schema: {
    imdbId: z.string().optional().describe("IMDb ID of the movie (e.g., 'tt0111161')"),
    tmdbId: z.number().optional().describe("TMDB ID of the movie"),
    title: z.string().optional().describe("Exact title of the movie to look up"),
    year: z.string().optional().describe("Year of release (helps disambiguate titles)"),
    plot: z.enum(["short", "full"]).optional().describe("Plot length: 'short' (default) or 'full'"),
    includeCredits: z.boolean().optional().describe("Include top cast and crew (default: true)"),
  },
  handler: async ({ imdbId, tmdbId, title, year, plot, includeCredits = true }, { tmdb, omdb }) => {
    const guardError = requireAtLeastOne("getting movie details", {
      imdbId,
      tmdbId,
      title,
    });
    if (guardError) return failWith(guardError);

    let finalImdbId: string | undefined = imdbId;
    let finalTmdbId: number | undefined = tmdbId;
    let tmdbDetails: TmdbMovieDetails | undefined;

    if (tmdbId && !imdbId) {
      tmdbDetails = await tmdb.getMovieDetails(tmdbId);
      finalImdbId = tmdbDetails.imdb_id || undefined;
      finalTmdbId = tmdbDetails.id;
    }

    if (!finalImdbId && !finalTmdbId && title) {
      const searchResult = await tmdb.searchMovies(title, {
        year: year ? parseInt(year) : undefined,
      });
      const firstResult = searchResult.results[0];
      if (firstResult) {
        finalTmdbId = firstResult.id;
        tmdbDetails = await tmdb.getMovieDetails(finalTmdbId);
        finalImdbId = tmdbDetails.imdb_id || undefined;
      }
    }

    let omdbResult;
    if (finalImdbId) {
      omdbResult = await omdb.getById({ imdbId: finalImdbId, plot });
    } else if (title) {
      omdbResult = await omdb.getByTitle({
        title,
        type: "movie",
        year,
        plot,
      });
      finalImdbId = omdbResult.imdbID;
    }

    if (!omdbResult || omdbResult.Type !== "movie") {
      throw new Error(
        omdbResult
          ? `The result is a ${omdbResult.Type}, not a movie. Use the appropriate tool for ${omdbResult.Type}.`
          : "Movie not found",
      );
    }

    let tmdbCredits;

    if (finalTmdbId) {
      [tmdbDetails, tmdbCredits] = await Promise.all([
        tmdbDetails ?? tmdb.getMovieDetails(finalTmdbId),
        includeCredits ? tmdb.getMovieCredits(finalTmdbId) : null,
      ]);
    } else if (finalImdbId) {
      tmdbDetails = (await tmdb.getMovieByImdbId(finalImdbId)) ?? undefined;
      if (tmdbDetails && includeCredits) {
        tmdbCredits = await tmdb.getMovieCredits(tmdbDetails.id);
      }
    }

    const output: Record<string, unknown> = {
      // Basic info (OMDB)
      title: omdbResult.Title,
      year: omdbResult.Year,
      rated: omdbResult.Rated,
      released: omdbResult.Released,
      runtime: omdbResult.Runtime,
      genre: omdbResult.Genre,
      plot: omdbResult.Plot,
      language: omdbResult.Language,
      country: omdbResult.Country,

      // IDs
      imdbId: omdbResult.imdbID,
      tmdbId: tmdbDetails?.id,

      // Ratings (OMDB - aggregated from multiple sources)
      ratings: omdbResult.Ratings,
      metascore: omdbResult.Metascore,
      imdbRating: omdbResult.imdbRating,
      imdbVotes: omdbResult.imdbVotes,
      tmdbRating: tmdbDetails?.vote_average,
      tmdbVoteCount: tmdbDetails?.vote_count,

      // Box office & Awards (OMDB)
      boxOffice: omdbResult.BoxOffice,
      awards: omdbResult.Awards,

      // Budget & Revenue (TMDB)
      budget: tmdbDetails?.budget,
      revenue: tmdbDetails?.revenue,

      // Basic credits (OMDB)
      director: omdbResult.Director,
      writer: omdbResult.Writer,
      actors: omdbResult.Actors,

      // Images (TMDB - higher quality)
      posterUrl: tmdbDetails
        ? tmdb.getImageUrl(tmdbDetails.poster_path, "w500")
        : omdbResult.Poster !== NA
          ? omdbResult.Poster
          : null,
      backdropUrl: tmdbDetails ? tmdb.getImageUrl(tmdbDetails.backdrop_path, "w1280") : null,

      // Additional metadata (TMDB)
      tagline: tmdbDetails?.tagline,
      overview: tmdbDetails?.overview,
      genres: tmdbDetails?.genres.map((g) => g.name),
      productionCompanies: tmdbDetails?.production_companies.map((c) => c.name),
    };

    if (tmdbCredits) {
      output.cast = tmdbCredits.cast.slice(0, 10).map((member) => ({
        name: member.name,
        character: member.character,
        tmdbId: member.id,
        profileImageUrl: tmdb.getImageUrl(member.profile_path, "w185"),
      }));

      const directors = crewByJob(tmdbCredits.crew, ["Director"]);
      const writers = crewWriters(tmdbCredits.crew);
      const composers = crewByJob(tmdbCredits.crew, ["Original Music Composer"]);
      const cinematographers = crewByJob(tmdbCredits.crew, ["Director of Photography"]);

      output.crew = {
        directors: directors.map((d) => ({ name: d.name, tmdbId: d.id })),
        writers: writers.slice(0, 5).map((w) => ({
          name: w.name,
          job: w.job,
          tmdbId: w.id,
        })),
        composers: composers.map((c) => ({ name: c.name, tmdbId: c.id })),
        cinematographers: cinematographers.map((c) => ({
          name: c.name,
          tmdbId: c.id,
        })),
      };
    }

    return output;
  },
});
