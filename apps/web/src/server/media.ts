import { createServerFn } from "@tanstack/react-start";
import {
  capTotalPages,
  extractOmdbRatings,
  extractYear,
  NA,
  OmdbApiError,
  type OmdbMovieDetails,
} from "@showtime/core";
import { getOmdb, getTmdb } from "./clients";
import { cached, TTL } from "./cache";
import {
  browseCacheKey,
  toDiscoverMovieOptions,
  toDiscoverTvOptions,
  type BrowseFilters,
  type GenreOption,
} from "./browse";
import { runSearch, searchCacheKey, type SearchFilters } from "./search";
import {
  fromMovie,
  fromTrending,
  fromTv,
  rankSimilar,
  shapeCollection,
  shapeEpisodeDetail,
  shapeEpisodeRatings,
  shapeMovie,
  shapePerson,
  shapeReviews,
  shapeTv,
  type CollectionDetail,
  type EpisodeDetail,
  type EpisodeRatingsData,
  type MediaDetail,
  type MediaItem,
  type MediaRatingsStatus,
  type PersonDetail,
  type SearchItem,
} from "./shaper";

// The UI shape types live in `./shaper` now. Re-export them here so existing
// component imports (`from "../server/media"`) keep working unchanged.
export type {
  CastMember,
  CollectionDetail,
  CollectionSummary,
  CreditName,
  EpisodeDetail,
  EpisodeRating,
  EpisodeRatingsData,
  ExternalRating,
  FilmographySection,
  MediaDetail,
  MediaGenre,
  MediaItem,
  MediaRatingsStatus,
  PersonCredit,
  PersonDetail,
  PersonItem,
  Review,
  SearchItem,
  SeasonRatings,
  WatchProvider,
  WhereToWatch,
} from "./shaper";

/**
 * Logs a handled upstream sub-fetch failure as a structured record and returns
 * `null` so the caller degrades gracefully instead of throwing. These failures
 * used to be swallowed silently; now they surface in Workers Logs with enough
 * context to diagnose them: which fetch failed, the id/params involved, and the
 * underlying error.
 *
 * `level` defaults to `error`. Pass `warn` for an expected, self-recovering
 * failure such as an OMDB rate limit, so the daily-quota noise does not drown
 * out genuine errors (a missing key, an outage) in the logs.
 */
const logUpstreamFailure =
  (fetch: string, context: Record<string, unknown>, level: "error" | "warn" = "error") =>
  (error: unknown): null => {
    const log = level === "warn" ? console.warn : console.error;
    log("upstream fetch failed", { fetch, ...context }, error);
    return null;
  };

/**
 * The OMDB ratings-fetch error policy, shared by the movie and TV detail
 * functions. Returns a `(error) => null` catch handler so the call site stays a
 * plain `.catch(omdbCatch(...))` and its awaited result narrows to
 * `OmdbXDetails | null` without a cast.
 *
 * - `not_found`: a definitive OMDB miss. Permanent, so it is silent (no status
 *   change, no log) and the empty result caches for the full window.
 * - `rate_limited`: the daily quota is exhausted. Expected and self-recovering,
 *   so it is logged at warn and flagged so the page can say "temporarily
 *   unavailable".
 * - anything else (outage, bad key): logged at error and flagged unavailable.
 *
 * `setStatus` lets each caller fold the outcome back into its own
 * `ratingsStatus` (both pass `(s) => { ratingsStatus = s; }`).
 */
export const omdbCatch =
  (
    label: string,
    context: Record<string, unknown>,
    setStatus: (status: MediaRatingsStatus) => void,
  ) =>
  (error: unknown): null => {
    if (error instanceof OmdbApiError && error.kind === "not_found") return null;
    if (error instanceof OmdbApiError && error.kind === "rate_limited") {
      setStatus("rate_limited");
      return logUpstreamFailure(label, context, "warn")(error);
    }
    setStatus("unavailable");
    return logUpstreamFailure(label, context)(error);
  };

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
  async (): Promise<GenreOption[]> =>
    cached("genres:movie", TTL.week, async () => getTmdb().getMovieGenres()),
);

export const getTvGenres = createServerFn({ method: "GET" }).handler(
  async (): Promise<GenreOption[]> =>
    cached("genres:tv", TTL.week, async () => getTmdb().getTvGenres()),
);

export type { SearchFilters, SearchSearch, SearchType } from "./search";

/**
 * A page of search results plus the pagination envelope and the echoed query.
 * `query` is the caller's own (used in the search box, heading, and page title),
 * preserving its casing; the cache is keyed on a lowercased query so casing
 * variants share an entry without leaking one caller's casing to another.
 */
export interface SearchResult {
  query: string;
  results: SearchItem[];
  page: number;
  totalPages: number;
}

export const searchMedia = createServerFn({ method: "GET" })
  .validator((filters: SearchFilters) => filters)
  .handler(async ({ data: filters }): Promise<SearchResult> => {
    // Short-circuit a blank query before touching the client or cache, so an
    // empty search neither hits TMDB nor pollutes the cache with empty pages.
    if (!filters.query) return { query: "", results: [], page: 1, totalPages: 0 };
    const { results, page, totalPages } = await cached(
      `search:${searchCacheKey(filters)}`,
      TTL.hour,
      async () => runSearch(getTmdb(), filters),
    );
    return { query: filters.query, results, page, totalPages };
  });

export const getMovieDetail = createServerFn({ method: "GET" })
  .validator((id: number) => id)
  .handler(async ({ data: id }): Promise<MediaDetail> => {
    // Tracks whether the OMDB ratings fetch succeeded. Anything other than "ok"
    // means the IMDb/Rotten Tomatoes ratings are missing because the call
    // failed, so the partial payload is cached briefly (see `cached`'s
    // `isDegraded`) and the detail page can say why instead of dropping the
    // chips silently.
    let ratingsStatus: MediaRatingsStatus = "ok";
    return cached(
      `movie-detail:${id}`,
      TTL.day,
      async () => {
        const tmdb = getTmdb();
        const omdb = getOmdb();
        const [details, credits, providers, videos, recommendations, reviews] = await Promise.all([
          tmdb.getMovieDetails(id),
          tmdb.getMovieCredits(id).catch(logUpstreamFailure("tmdb.getMovieCredits", { id })),
          tmdb.getWatchProviders(id).catch(logUpstreamFailure("tmdb.getWatchProviders", { id })),
          tmdb.getMovieVideos(id).catch(logUpstreamFailure("tmdb.getMovieVideos", { id })),
          tmdb
            .getMovieRecommendations(id)
            .catch(logUpstreamFailure("tmdb.getMovieRecommendations", { id })),
          // Reviews are a non-critical extra; a failed or slow fetch degrades
          // to no section rather than breaking the rest of the detail page.
          tmdb.getMovieReviews(id).catch(logUpstreamFailure("tmdb.getMovieReviews", { id })),
        ]);
        // An imdb_id lookup for a movie resolves to movie details.
        const omdbData = details.imdb_id
          ? await (omdb.getById({ imdbId: details.imdb_id }) as Promise<OmdbMovieDetails>).catch(
              omdbCatch("omdb.getById", { imdbId: details.imdb_id }, (status) => {
                ratingsStatus = status;
              }),
            )
          : null;
        const { ratings, awards } = extractOmdbRatings(omdbData);
        // Recommendations are usually higher quality than /similar; fall back to
        // /similar only when TMDB has no recommendations for this title.
        const similarSource = recommendations?.results?.length
          ? recommendations.results
          : ((
              await tmdb
                .getSimilarMovies(id)
                .catch(logUpstreamFailure("tmdb.getSimilarMovies", { id }))
            )?.results ?? []);
        const similar = rankSimilar(similarSource.map(fromMovie));
        return shapeMovie(
          details,
          credits,
          providers,
          videos,
          ratings,
          awards,
          ratingsStatus,
          details.imdb_id ?? undefined,
          similar,
          shapeReviews(reviews),
        );
      },
      { isDegraded: () => ratingsStatus !== "ok" },
    );
  });

export const getCollectionDetail = createServerFn({ method: "GET" })
  .validator((id: number) => id)
  .handler(
    async ({ data: id }): Promise<CollectionDetail> =>
      // A franchise's part list changes rarely (only when a new film is added),
      // so the day-level TTL the other detail functions use fits here. Keyed per
      // collection id.
      cached(`collection-detail:${id}`, TTL.day, async () => {
        const tmdb = getTmdb();
        const collection = await tmdb.getCollection(id);
        return shapeCollection(collection);
      }),
  );

export const getTvDetail = createServerFn({ method: "GET" })
  .validator((id: number) => id)
  .handler(async ({ data: id }): Promise<MediaDetail> => {
    // Tracks whether the OMDB ratings fetch succeeded. Anything other than "ok"
    // means the IMDb/Rotten Tomatoes ratings are missing because the call
    // failed, so the partial payload is cached briefly (see `cached`'s
    // `isDegraded`) and the detail page can say why instead of dropping the
    // chips silently.
    let ratingsStatus: MediaRatingsStatus = "ok";
    return cached(
      `tv-detail:${id}`,
      TTL.day,
      async () => {
        const tmdb = getTmdb();
        const omdb = getOmdb();
        const [details, credits, providers, videos, recommendations, reviews] = await Promise.all([
          tmdb.getTvDetails(id),
          tmdb.getTvCredits(id).catch(logUpstreamFailure("tmdb.getTvCredits", { id })),
          tmdb
            .getTvWatchProviders(id)
            .catch(logUpstreamFailure("tmdb.getTvWatchProviders", { id })),
          tmdb.getTvVideos(id).catch(logUpstreamFailure("tmdb.getTvVideos", { id })),
          tmdb
            .getTvRecommendations(id)
            .catch(logUpstreamFailure("tmdb.getTvRecommendations", { id })),
          // Reviews are a non-critical extra; a failed or slow fetch degrades
          // to no section rather than breaking the rest of the detail page.
          tmdb.getTvReviews(id).catch(logUpstreamFailure("tmdb.getTvReviews", { id })),
        ]);
        const year = extractYear(details.first_air_date);
        const omdbData = await omdb
          .getByTitle({
            title: details.name,
            type: "series",
            year: year !== NA ? year : undefined,
          })
          .catch(
            omdbCatch("omdb.getByTitle", { title: details.name, year }, (status) => {
              ratingsStatus = status;
            }),
          );
        const { ratings, awards } = extractOmdbRatings(omdbData);
        const similarSource = recommendations?.results?.length
          ? recommendations.results
          : ((await tmdb.getSimilarTv(id).catch(logUpstreamFailure("tmdb.getSimilarTv", { id })))
              ?.results ?? []);
        const similar = rankSimilar(similarSource.map(fromTv));
        return shapeTv(
          details,
          credits,
          providers,
          videos,
          ratings,
          awards,
          ratingsStatus,
          omdbData?.imdbID,
          similar,
          shapeReviews(reviews),
        );
      },
      { isDegraded: () => ratingsStatus !== "ok" },
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

/**
 * The episode-ratings payload as the TV detail route hands it to the UI.
 * `ready` carries the shaped data (which may have zero seasons when OMDB simply
 * has no episodes for the series); `unavailable` means the fetch failed, e.g.
 * OMDB was rate-limited and nothing was cached yet, so the section can say so
 * rather than silently rendering nothing.
 */
export type EpisodeRatingsResult =
  | { status: "ready"; data: EpisodeRatingsData }
  | { status: "unavailable" };

/** Args for the on-demand episode-detail fetch: which episode of which series. */
export interface EpisodeDetailArgs {
  tvId: number;
  season: number;
  episode: number;
}

/**
 * Richer detail (plot, guest stars) for one episode, fetched on demand when an
 * episode is opened. The episode list itself is served from the already-streamed
 * `getEpisodeRatings` data, so this only runs an extra call when a user drills
 * into a specific episode. Sourced from TMDB rather than OMDB so it is not
 * subject to OMDB's daily request limit. Keyed per series/season/episode and
 * held for a week, matching the ratings TTL.
 */
export const getEpisodeDetail = createServerFn({ method: "GET" })
  .validator((args: EpisodeDetailArgs) => args)
  .handler(
    async ({ data: { tvId, season, episode } }): Promise<EpisodeDetail> =>
      cached(`episode:${tvId}:${season}:${episode}`, TTL.week, async () => {
        const tmdb = getTmdb();
        const details = await tmdb.getTvEpisodeDetails(tvId, season, episode);
        return shapeEpisodeDetail(details);
      }),
  );
