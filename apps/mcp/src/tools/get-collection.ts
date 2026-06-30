import { z } from "zod";
import { defineTool, failWith } from "./define-tool.js";
import { extractYear, NA, truncateText } from "@showtime/core";
import { requireAtLeastOne, resolveMedia } from "./helpers/resolvers.js";

export const getCollectionTool = defineTool({
  name: "get_collection",
  title: "Get Movie Collection",
  description:
    "Get all movies in a collection/franchise (e.g., all Marvel movies, all Harry Potter movies). You can search by collection ID or find a collection by providing a movie from that collection.",
  schema: {
    collectionId: z.number().optional().describe("TMDB collection ID"),
    movieTmdbId: z
      .number()
      .optional()
      .describe("TMDB movie ID - will find the collection this movie belongs to"),
    movieTitle: z
      .string()
      .optional()
      .describe("Movie title - will find the collection this movie belongs to"),
  },
  handler: async ({ collectionId, movieTmdbId, movieTitle }, clients) => {
    const guardError = requireAtLeastOne("getting collection", {
      collectionId,
      movieTmdbId,
      movieTitle,
    });
    if (guardError) return failWith(guardError);

    let finalCollectionId: number | undefined = collectionId;

    if (!finalCollectionId) {
      const media = await resolveMedia(clients, {
        mediaType: "movie",
        tmdbId: movieTmdbId,
        title: movieTitle,
      });

      const movieDetails = await clients.tmdb.getMovieDetails(media.id);
      if (!movieDetails.belongs_to_collection) {
        throw new Error(`"${movieDetails.title}" is not part of a collection/franchise`);
      }

      finalCollectionId = movieDetails.belongs_to_collection.id;
    }

    const collection = await clients.tmdb.getCollection(finalCollectionId);

    const sortedMovies = [...collection.parts].sort((a, b) => {
      const dateA = a.release_date || "";
      const dateB = b.release_date || "";
      return dateA.localeCompare(dateB);
    });

    const formattedMovies = sortedMovies.map((movie, index) => ({
      order: index + 1,
      tmdbId: movie.id,
      title: movie.title,
      year: extractYear(movie.release_date),
      releaseDate: movie.release_date || NA,
      overview: truncateText(movie.overview || "", 200),
      tmdbRating: movie.vote_average,
      voteCount: movie.vote_count,
      posterUrl: clients.tmdb.getImageUrl(movie.poster_path, "w342"),
    }));

    return {
      collectionId: collection.id,
      name: collection.name,
      overview: collection.overview || "No overview available",
      posterUrl: clients.tmdb.getImageUrl(collection.poster_path, "w500"),
      backdropUrl: clients.tmdb.getImageUrl(collection.backdrop_path, "w1280"),
      totalMovies: collection.parts.length,
      movies: formattedMovies,
    };
  },
});
