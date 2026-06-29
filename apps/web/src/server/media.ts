import { createServerFn } from "@tanstack/react-start";
import {
  capTotalPages,
  extractYear,
  NA,
  OmdbApiError,
  type OmdbMovieDetails,
  type OmdbSeriesDetails,
  type TmdbGenre,
} from "@showtime/core";
import { getOmdb, getTmdb } from "./clients";
import { cached, TTL } from "./cache";
import {
  browseCacheKey,
  toDiscoverMovieOptions,
  toDiscoverTvOptions,
  type BrowseFilters,
} from "./browse";
import {
  fromMovie,
  fromMulti,
  fromTrending,
  fromTv,
  mapOmdbRatings,
  rankSimilar,
  shapeEpisodeRatings,
  shapeMovie,
  shapePerson,
  shapeTv,
  type EpisodeRatingsData,
  type MediaDetail,
  type MediaItem,
  type PersonDetail,
  type SearchItem,
} from "./shaper";

// The UI shape types live in `./shaper` now. Re-export them here so existing
// component imports (`from "../server/media"`) keep working unchanged.
export type {
  CastMember,
  CreditName,
  EpisodeRating,
  EpisodeRatingsData,
  ExternalRating,
  FilmographySection,
  MediaDetail,
  MediaGenre,
  MediaItem,
  PersonCredit,
  PersonDetail,
  PersonItem,
  SearchItem,
  SeasonRatings,
  WatchProvider,
  WhereToWatch,
} from "./shaper";

// ----- server functions -------------------------------------------------------
//
// These are thin orchestration: each `createServerFn` fetches via the core
// clients, wraps the work in the `cached(...)` adapter, and delegates all
// upstream->display mapping and assembly to the pure functions in `./shaper`.
// No inline mapping/ranking/assembly logic lives here.

export const getHomeData = createServerFn({ method: "GET" }).handler(async () =>
  cached("home", TTL.hour, async () => {
    const tmdb = getTmdb();
    const [trending, upcoming] = await Promise.all([
      tmdb.getTrending("all", "week"),
      tmdb.getUpcomingMovies(),
    ]);
    return {
      trending: trending.results
        .map(fromTrending)
        .filter((item): item is MediaItem => item !== null),
      upcoming: upcoming.results.map(fromMovie),
    };
  }),
);

/**
 * A page of browse results plus the pagination envelope the UI needs. `page` is
 * the page actually served and `totalPages` is capped via core's `capTotalPages`
 * (TMDB refuses pages beyond 500), so the pagination control can disable "next"
 * cleanly at the ceiling.
 */
export interface BrowseResult {
  items: MediaItem[];
  page: number;
  totalPages: number;
}

export type { BrowseFilters, BrowseSearch, BrowseSort } from "./browse";

export const browseMovies = createServerFn({ method: "GET" })
  .validator((filters: BrowseFilters) => filters)
  .handler(
    async ({ data: filters }): Promise<BrowseResult> =>
      // Discover results shift over time, so the hour tier (matching the home
      // page) fits. Keyed on the full filter combination so distinct views do
      // not collide in the cache.
      cached(`browse:movie:${browseCacheKey(filters)}`, TTL.hour, async () => {
        const tmdb = getTmdb();
        const response = await tmdb.discoverMovies(toDiscoverMovieOptions(filters));
        return {
          items: response.results.map(fromMovie),
          page: response.page,
          totalPages: capTotalPages(response.total_pages),
        };
      }),
  );

export const browseTv = createServerFn({ method: "GET" })
  .validator((filters: BrowseFilters) => filters)
  .handler(
    async ({ data: filters }): Promise<BrowseResult> =>
      cached(`browse:tv:${browseCacheKey(filters)}`, TTL.hour, async () => {
        const tmdb = getTmdb();
        const response = await tmdb.discoverTv(toDiscoverTvOptions(filters));
        return {
          items: response.results.map(fromTv),
          page: response.page,
          totalPages: capTotalPages(response.total_pages),
        };
      }),
  );

// Genre lists change rarely, so they carry a long TTL. They feed the genre
// control's options so the choices match what TMDB actually has.
export const getMovieGenres = createServerFn({ method: "GET" }).handler(
  async (): Promise<TmdbGenre[]> =>
    cached("genres:movie", TTL.week, async () => getTmdb().getMovieGenres()),
);

export const getTvGenres = createServerFn({ method: "GET" }).handler(
  async (): Promise<TmdbGenre[]> =>
    cached("genres:tv", TTL.week, async () => getTmdb().getTvGenres()),
);

export const searchMulti = createServerFn({ method: "GET" })
  .validator((query: string) => query)
  .handler(async ({ data }) => {
    const query = data?.trim();
    if (!query) return { query: "", results: [] as SearchItem[] };
    // Cache only the results, keyed on the normalized query. The echoed `query`
    // is the caller's own (used in the search box, heading, and page title), so
    // it must not be served from another caller's cached casing.
    const results = await cached(`search:${query.toLowerCase()}`, TTL.hour, async () => {
      const tmdb = getTmdb();
      const response = await tmdb.multiSearch(query);
      return response.results.map(fromMulti).filter((item): item is SearchItem => item !== null);
    });
    return { query, results };
  });

export const getMovieDetail = createServerFn({ method: "GET" })
  .validator((id: number) => id)
  .handler(async ({ data: id }): Promise<MediaDetail> => {
    // Set when an OMDB call we expected to succeed failed, so the partial
    // payload (empty IMDb/Rotten Tomatoes ratings) is cached briefly instead of
    // for a full day. See `cached`'s `isDegraded` option.
    let omdbFailed = false;
    return cached(
      `movie-detail:${id}`,
      TTL.day,
      async () => {
        const tmdb = getTmdb();
        const omdb = getOmdb();
        const [details, credits, providers, videos, recommendations] = await Promise.all([
          tmdb.getMovieDetails(id),
          tmdb.getMovieCredits(id).catch(() => null),
          tmdb.getWatchProviders(id).catch(() => null),
          tmdb.getMovieVideos(id).catch(() => null),
          tmdb.getMovieRecommendations(id).catch(() => null),
        ]);
        const omdbData = details.imdb_id
          ? ((await omdb.getById({ imdbId: details.imdb_id }).catch((error) => {
              // Only a transient failure (network/timeout/5xx) should shorten the
              // cache. A definitive OMDB "not found" (OmdbApiError) is permanent,
              // so caching it for the full day is correct.
              if (!(error instanceof OmdbApiError)) omdbFailed = true;
              return null;
            })) as OmdbMovieDetails | null)
          : null;
        const { ratings, awards } = mapOmdbRatings(omdbData);
        // Recommendations are usually higher quality than /similar; fall back to
        // /similar only when TMDB has no recommendations for this title.
        const similarSource = recommendations?.results?.length
          ? recommendations.results
          : ((await tmdb.getSimilarMovies(id).catch(() => null))?.results ?? []);
        const similar = rankSimilar(similarSource.map(fromMovie));
        return shapeMovie(
          details,
          credits,
          providers,
          videos,
          ratings,
          awards,
          details.imdb_id ?? undefined,
          similar,
        );
      },
      { isDegraded: () => omdbFailed },
    );
  });

export const getTvDetail = createServerFn({ method: "GET" })
  .validator((id: number) => id)
  .handler(async ({ data: id }): Promise<MediaDetail> => {
    // Set when an OMDB call we expected to succeed failed, so the partial
    // payload (empty IMDb/Rotten Tomatoes ratings) is cached briefly instead of
    // for a full day. See `cached`'s `isDegraded` option.
    let omdbFailed = false;
    return cached(
      `tv-detail:${id}`,
      TTL.day,
      async () => {
        const tmdb = getTmdb();
        const omdb = getOmdb();
        const [details, credits, providers, videos, recommendations] = await Promise.all([
          tmdb.getTvDetails(id),
          tmdb.getTvCredits(id).catch(() => null),
          tmdb.getTvWatchProviders(id).catch(() => null),
          tmdb.getTvVideos(id).catch(() => null),
          tmdb.getTvRecommendations(id).catch(() => null),
        ]);
        const year = extractYear(details.first_air_date);
        const omdbData = (await omdb
          .getByTitle({
            title: details.name,
            type: "series",
            year: year !== NA ? year : undefined,
          })
          .catch((error) => {
            // Title+year lookups legitimately miss for series OMDB does not have,
            // raising OmdbApiError. That is permanent, not transient, so it must
            // not shorten the cache; only flag genuine transient failures.
            if (!(error instanceof OmdbApiError)) omdbFailed = true;
            return null;
          })) as OmdbSeriesDetails | null;
        const { ratings, awards } = mapOmdbRatings(omdbData);
        const similarSource = recommendations?.results?.length
          ? recommendations.results
          : ((await tmdb.getSimilarTv(id).catch(() => null))?.results ?? []);
        const similar = rankSimilar(similarSource.map(fromTv));
        return shapeTv(
          details,
          credits,
          providers,
          videos,
          ratings,
          awards,
          omdbData?.imdbID,
          similar,
        );
      },
      { isDegraded: () => omdbFailed },
    );
  });

export const getPersonDetail = createServerFn({ method: "GET" })
  .validator((id: number) => id)
  .handler(
    async ({ data: id }): Promise<PersonDetail> =>
      // Person data shifts slowly, so the day-level TTL the movie/TV detail
      // functions use fits here too. Keyed per person id.
      cached(`person-detail:${id}`, TTL.day, async () => {
        const tmdb = getTmdb();
        const [details, credits] = await Promise.all([
          tmdb.getPersonDetails(id),
          tmdb.getPersonCombinedCredits(id),
        ]);
        return shapePerson(details, credits);
      }),
  );

/**
 * Per-episode IMDb ratings across all seasons, for the heatmap. This is the
 * heaviest OMDB consumer (one call per season), so it carries the longest TTL.
 */
export const getEpisodeRatings = createServerFn({ method: "GET" })
  .validator((imdbId: string) => imdbId)
  .handler(
    async ({ data: imdbId }): Promise<EpisodeRatingsData> =>
      cached(`episodes:${imdbId}`, TTL.week, async () => {
        const omdb = getOmdb();
        const seasons = await omdb.getAllEpisodes({ seriesId: imdbId });
        return shapeEpisodeRatings(seasons);
      }),
  );
