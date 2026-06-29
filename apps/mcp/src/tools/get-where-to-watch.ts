import { z } from "zod";
import { defineTool } from "./define-tool.js";
import { resolveMedia } from "./helpers/resolvers.js";

export const getWhereToWatchTool = defineTool({
  name: "get_where_to_watch",
  title: "Get Where to Watch",
  description:
    "Find streaming services, rental options, and purchase options for a movie or TV series. Powered by JustWatch data via TMDB.",
  schema: {
    mediaType: z
      .enum(["movie", "tv"])
      .optional()
      .describe(
        "Whether to look up a movie or a TV series (default: 'movie'). A tmdbId must match this type."
      ),
    title: z
      .string()
      .optional()
      .describe("Movie or TV series title to search for"),
    tmdbId: z
      .number()
      .optional()
      .describe(
        "TMDB ID of the movie or TV series (more accurate than title search). Must match mediaType."
      ),
    imdbId: z
      .string()
      .optional()
      .describe("IMDb ID (e.g., 'tt0111161'). Movie lookups only; ignored for TV."),
    region: z
      .string()
      .optional()
      .describe(
        "Country code for regional availability (default: 'US'). Examples: 'US', 'GB', 'CA', 'AU', 'DE', 'FR'"
      ),
  },
  handler: async (
    { mediaType = "movie", title, tmdbId, imdbId, region = "US" },
    clients
  ) => {
    const media = await resolveMedia(clients, {
      mediaType,
      tmdbId,
      imdbId,
      title,
    });

    const watchProviders =
      media.type === "tv"
        ? await clients.tmdb.getTvWatchProviders(media.id)
        : await clients.tmdb.getWatchProviders(media.id);

    const regionData = watchProviders.results[region.toUpperCase()];

    if (!regionData) {
      return {
        mediaType: media.type,
        mediaTitle: media.name,
        tmdbId: media.id,
        region: region.toUpperCase(),
        message: `No streaming/rental/purchase options available in ${region.toUpperCase()}`,
        availableRegions: Object.keys(watchProviders.results).slice(0, 20),
      };
    }

    const formatProviders = (
      providers?: Array<{ provider_name: string; logo_path: string }>
    ) => {
      if (!providers || providers.length === 0) return [];
      return providers.map((provider) => ({
        name: provider.provider_name,
        logoUrl: clients.tmdb.getImageUrl(provider.logo_path, "w92"),
      }));
    };

    return {
      mediaType: media.type,
      mediaTitle: media.name,
      tmdbId: media.id,
      region: region.toUpperCase(),
      justWatchLink: regionData.link,
      streaming: formatProviders(regionData.flatrate),
      rent: formatProviders(regionData.rent),
      buy: formatProviders(regionData.buy),
      freeWithAds: formatProviders(regionData.free),
    };
  },
});
