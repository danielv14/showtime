import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { OmdbClient } from "@showtime/core";
import type { TmdbClient } from "@showtime/core";
import { registerTool, type AnyToolDefinition } from "./define-tool.js";

// TMDB-powered tools
import { searchMoviesTool } from "./search-movies.js";
import { searchPersonTool } from "./search-person.js";
import { discoverMoviesTool } from "./discover-movies.js";
import { discoverTvTool } from "./discover-tv.js";
import { getWhereToWatchTool } from "./get-where-to-watch.js";
import { getFilmographyTool } from "./get-filmography.js";
import { getTrendingTool } from "./get-trending.js";
import { getMovieRecommendationsTool } from "./get-recommendations.js";
import { getTvRecommendationsTool } from "./get-tv-recommendations.js";
import { getCollectionTool } from "./get-collection.js";
import { getVideosTool } from "./get-videos.js";
import { getNowPlayingTool } from "./get-now-playing.js";
import { getUpcomingTool } from "./get-upcoming.js";
import { getAiringTodayTool } from "./get-airing-today.js";
import { getOnTheAirTool } from "./get-on-the-air.js";
import { getGenresTool } from "./get-genres.js";
import { getPersonDetailsTool } from "./get-person-details.js";
import { multiSearchTool } from "./multi-search.js";
import { getSimilarTool } from "./get-similar.js";
import { getReviewsTool } from "./get-reviews.js";

// Hybrid tools (OMDB + TMDB)
import { getMovieTool } from "./get-movie.js";

// OMDB-only tools (TV series)
import { searchSeriesTool } from "./search-series.js";
import { getSeriesTool } from "./get-series.js";
import { getEpisodeTool } from "./get-episode.js";
import { getSeasonTool } from "./get-season.js";
import { getAllEpisodesTool } from "./get-all-episodes.js";

/** Every tool, declared via the defineTool seam and registered in one loop. */
const toolDefinitions: AnyToolDefinition[] = [
  // TMDB-powered tools
  searchMoviesTool,
  searchPersonTool,
  discoverMoviesTool,
  discoverTvTool,
  getWhereToWatchTool,
  getFilmographyTool,
  getTrendingTool,
  getMovieRecommendationsTool,
  getTvRecommendationsTool,
  getCollectionTool,
  getVideosTool,
  getNowPlayingTool,
  getUpcomingTool,
  getAiringTodayTool,
  getOnTheAirTool,
  getGenresTool,
  getPersonDetailsTool,
  multiSearchTool,
  getSimilarTool,
  getReviewsTool,
  // Hybrid tool (combines OMDB ratings with TMDB data)
  getMovieTool,
  // OMDB-only tools (TV series support)
  searchSeriesTool,
  getSeriesTool,
  getEpisodeTool,
  getSeasonTool,
  getAllEpisodesTool,
];

export const registerAllTools = (
  server: McpServer,
  omdbClient: OmdbClient,
  tmdbClient: TmdbClient,
) => {
  const clients = { tmdb: tmdbClient, omdb: omdbClient };
  for (const definition of toolDefinitions) {
    registerTool(server, definition, clients);
  }
};
