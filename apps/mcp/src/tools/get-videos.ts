import { z } from "zod";
import type { TmdbVideo } from "@showtime/core";
import { defineTool, failWith } from "./define-tool.js";
import { formatVideo } from "@showtime/core";
import { requireAtLeastOne } from "./helpers/resolvers.js";

export const getVideosTool = defineTool({
  name: "get_videos",
  title: "Get Videos",
  description:
    "Get trailers, teasers, clips, and behind-the-scenes videos for movies and TV shows. Returns YouTube/Vimeo links.",
  schema: {
    movieId: z
      .number()
      .optional()
      .describe("TMDB movie ID (use search_movies to find IDs)"),
    tvId: z
      .number()
      .optional()
      .describe("TMDB TV series ID (use search_series to find IDs)"),
    type: z
      .enum(["Trailer", "Teaser", "Clip", "Behind the Scenes", "Featurette", "all"])
      .optional()
      .describe("Filter by video type (default: all)"),
  },
  handler: async ({ movieId, tvId, type = "all" }, { tmdb }) => {
    const guardError = requireAtLeastOne("getting videos", { movieId, tvId });
    if (guardError) return failWith(guardError);

    let videos: TmdbVideo[] = [];
    let mediaTitle = "";
    let mediaType: "movie" | "tv" = "movie";

    if (movieId) {
      const [videosResponse, movieDetails] = await Promise.all([
        tmdb.getMovieVideos(movieId),
        tmdb.getMovieDetails(movieId),
      ]);
      videos = videosResponse.results;
      mediaTitle = movieDetails.title;
      mediaType = "movie";
    } else if (tvId) {
      const [videosResponse, tvDetails] = await Promise.all([
        tmdb.getTvVideos(tvId),
        tmdb.getTvDetails(tvId),
      ]);
      videos = videosResponse.results;
      mediaTitle = tvDetails.name;
      mediaType = "tv";
    }

    // Filter by type if specified
    if (type !== "all") {
      videos = videos.filter((v) => v.type === type);
    }

    // Sort: official first, then by publish date (newest first)
    videos.sort((a, b) => {
      if (a.official !== b.official) return a.official ? -1 : 1;
      return (
        new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
      );
    });

    const formattedVideos = videos.map(formatVideo);

    return {
      mediaType,
      mediaTitle,
      mediaId: movieId || tvId,
      videos: formattedVideos,
      totalVideos: formattedVideos.length,
      filter: type,
    };
  },
});
