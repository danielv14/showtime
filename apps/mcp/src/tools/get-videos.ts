import { z } from "zod";
import { defineTool } from "./define-tool.js";
import { formatVideo } from "@showtime/core";
import { resolveMovieOrTv } from "./helpers/resolvers.js";

export const getVideosTool = defineTool({
  name: "get_videos",
  title: "Get Videos",
  description:
    "Get trailers, teasers, clips, and behind-the-scenes videos for movies and TV shows. Returns YouTube/Vimeo links.",
  schema: {
    movieId: z.number().optional().describe("TMDB movie ID (use search_movies to find IDs)"),
    tvId: z.number().optional().describe("TMDB TV series ID (use search_series to find IDs)"),
    type: z
      .enum(["Trailer", "Teaser", "Clip", "Behind the Scenes", "Featurette", "all"])
      .optional()
      .describe("Filter by video type (default: all)"),
  },
  handler: async ({ movieId, tvId, type = "all" }, clients) => {
    // Route through the shared movie/tv resolver so the id-pair guard and
    // resolution match get_reviews / get_similar. It resolves the title too, so
    // we only fetch the videos here.
    const media = await resolveMovieOrTv(clients, { movieId, tvId });

    const videosResponse =
      media.type === "movie"
        ? await clients.tmdb.getMovieVideos(media.id)
        : await clients.tmdb.getTvVideos(media.id);
    let videos = videosResponse.results;

    // Filter by type if specified
    if (type !== "all") {
      videos = videos.filter((v) => v.type === type);
    }

    // Sort: official first, then by publish date (newest first)
    videos.sort((a, b) => {
      if (a.official !== b.official) return a.official ? -1 : 1;
      return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
    });

    const formattedVideos = videos.map(formatVideo);

    return {
      mediaType: media.type,
      mediaTitle: media.name,
      mediaId: media.id,
      videos: formattedVideos,
      totalVideos: formattedVideos.length,
      filter: type,
    };
  },
});
