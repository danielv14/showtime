import { createServerFn } from "@tanstack/react-start";
import {
  buildTmdbImageUrl as img,
  extractYear,
  formatWatchProviders,
  NA,
  type TmdbMovieSearchResult,
  type TmdbTvSearchResult,
  type TmdbTrendingResult,
  type TmdbMultiSearchResult,
  type TmdbCredits,
  type TmdbWatchProviders,
  type TmdbVideosResponse,
  type TmdbMovieDetails,
  type TmdbTvDetails,
  type OmdbMovieDetails,
  type OmdbSeriesDetails,
  type OmdbSeasonResponse,
} from "@showtime/core";
import { getOmdb, getTmdb } from "./clients";
import { cached, TTL } from "./cache";

const POSTER_SIZE = "w342";
const BACKDROP_SIZE = "w1280";
const PROFILE_SIZE = "w185";

// ----- UI-facing shapes -------------------------------------------------------

export interface MediaItem {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  year: string;
  rating: number;
  posterUrl: string | null;
  backdropUrl: string | null;
  overview: string;
}

export interface PersonItem {
  id: number;
  mediaType: "person";
  name: string;
  department: string;
  profileUrl: string | null;
  knownFor: string[];
}

export type SearchItem = MediaItem | PersonItem;

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profileUrl: string | null;
}

export interface CrewCredit {
  id: number;
  name: string;
  job: string;
}

export interface WatchProvider {
  name: string;
  logoUrl: string | null;
}

export interface WhereToWatch {
  region: string;
  link: string | null;
  flatrate: WatchProvider[];
  rent: WatchProvider[];
  buy: WatchProvider[];
}

export interface ExternalRating {
  source: string;
  value: string;
}

export interface MediaDetail {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  tagline: string;
  year: string;
  overview: string;
  runtime: string | null;
  genres: string[];
  posterUrl: string | null;
  backdropUrl: string | null;
  tmdbRating: number;
  tmdbVotes: number;
  status: string;
  cast: CastMember[];
  directors: string[];
  writers: string[];
  trailerUrl: string | null;
  whereToWatch: WhereToWatch | null;
  ratings: ExternalRating[];
  awards: string | null;
  similar: MediaItem[];
  imdbId?: string;
  // TV-only extras
  seasons?: number;
  episodes?: number;
  networks?: string[];
}

/** One episode in the ratings heatmap. `rating` is null when IMDb has none. */
export interface EpisodeRating {
  episode: number;
  title: string;
  rating: number | null;
  airDate: string;
}

export interface SeasonRatings {
  season: number;
  average: number | null;
  episodes: EpisodeRating[];
}

export interface EpisodeRatingsData {
  seasons: SeasonRatings[];
  /** Highest episode number across all seasons; drives the heatmap's episode axis. */
  maxEpisodes: number;
}

// ----- mappers ----------------------------------------------------------------

const fromMovie = (m: TmdbMovieSearchResult): MediaItem => ({
  id: m.id,
  mediaType: "movie",
  title: m.title,
  year: extractYear(m.release_date),
  rating: m.vote_average,
  posterUrl: img(m.poster_path, POSTER_SIZE),
  backdropUrl: img(m.backdrop_path, BACKDROP_SIZE),
  overview: m.overview ?? "",
});

const fromTv = (t: TmdbTvSearchResult): MediaItem => ({
  id: t.id,
  mediaType: "tv",
  title: t.name,
  year: extractYear(t.first_air_date),
  rating: t.vote_average,
  posterUrl: img(t.poster_path, POSTER_SIZE),
  backdropUrl: img(t.backdrop_path, BACKDROP_SIZE),
  overview: t.overview ?? "",
});

// Trending "all" also returns people; filter them out so they are not
// rendered or routed as movies or TV.
const fromTrending = (r: TmdbTrendingResult): MediaItem | null => {
  if (r.media_type !== "movie" && r.media_type !== "tv") return null;
  return {
    id: r.id,
    mediaType: r.media_type,
    title: r.title ?? r.name ?? "Untitled",
    year: extractYear(r.release_date ?? r.first_air_date),
    rating: r.vote_average,
    posterUrl: img(r.poster_path, POSTER_SIZE),
    backdropUrl: img(r.backdrop_path, BACKDROP_SIZE),
    overview: r.overview ?? "",
  };
};

const fromMulti = (r: TmdbMultiSearchResult): SearchItem | null => {
  if (r.media_type === "person") {
    return {
      id: r.id,
      mediaType: "person",
      name: r.name ?? r.title ?? "Unknown",
      department: r.known_for_department ?? "Acting",
      profileUrl: img(r.profile_path, PROFILE_SIZE),
      knownFor: (r.known_for ?? [])
        .map((k) => k.title)
        .filter((t): t is string => Boolean(t))
        .slice(0, 3),
    };
  }
  if (r.media_type === "movie" || r.media_type === "tv") {
    return {
      id: r.id,
      mediaType: r.media_type,
      title: r.title ?? r.name ?? "Untitled",
      year: extractYear(r.release_date ?? r.first_air_date),
      rating: r.vote_average ?? 0,
      posterUrl: img(r.poster_path, POSTER_SIZE),
      backdropUrl: img(r.backdrop_path, BACKDROP_SIZE),
      overview: r.overview ?? "",
    };
  }
  return null;
};

const SIMILAR_LIMIT = 18;

// TMDB returns similar/recommended titles in relevance order, which stays the
// dominant signal. Recency and rating are gentle nudges so newer, better-liked
// matches rise a few spots without burying TMDB's top pick.
const RELEVANCE_WEIGHT = 1;
const RECENCY_WEIGHT = 0.2;
const RATING_WEIGHT = 0.1;
const RECENCY_WINDOW_YEARS = 20;

/**
 * Dedupe by id, drop poster-less entries, then re-rank: relevance-first with a
 * light recency + rating boost. Caps the count for the row.
 */
const rankSimilar = (items: MediaItem[]): MediaItem[] => {
  const seen = new Set<number>();
  const pool = items
    .filter((item) => item.posterUrl)
    .filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)));
  if (pool.length <= 1) return pool.slice(0, SIMILAR_LIMIT);

  const currentYear = new Date().getFullYear();
  const lastIndex = pool.length - 1;

  return pool
    .map((item, index) => {
      const relevance = 1 - index / lastIndex;
      const year = Number.parseInt(item.year, 10);
      const recency = Number.isFinite(year)
        ? Math.max(
            0,
            Math.min(1, (year - (currentYear - RECENCY_WINDOW_YEARS)) / RECENCY_WINDOW_YEARS),
          )
        : 0;
      const rating = item.rating > 0 ? item.rating / 10 : 0;
      const score =
        RELEVANCE_WEIGHT * relevance + RECENCY_WEIGHT * recency + RATING_WEIGHT * rating;
      return { item, index, score };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, SIMILAR_LIMIT)
    .map((scored) => scored.item);
};

const mapCast = (credits: TmdbCredits | null): CastMember[] =>
  (credits?.cast ?? []).slice(0, 21).map((c) => ({
    id: c.id,
    name: c.name,
    character: c.character,
    profileUrl: img(c.profile_path, PROFILE_SIZE),
  }));

const crewNames = (credits: TmdbCredits | null, jobs: string[]): string[] => {
  const seen = new Set<string>();
  return (credits?.crew ?? [])
    .filter((c) => jobs.includes(c.job))
    .filter((c) => (seen.has(c.name) ? false : (seen.add(c.name), true)))
    .map((c) => c.name);
};

const firstTrailerUrl = (videos: TmdbVideosResponse | null): string | null => {
  const results = videos?.results ?? [];
  const trailer =
    results.find((v) => v.site === "YouTube" && v.type === "Trailer" && v.official) ??
    results.find((v) => v.site === "YouTube" && v.type === "Trailer") ??
    results.find((v) => v.site === "YouTube");
  return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;
};

const PREFERRED_REGIONS = ["SE", "US", "GB"];

const mapProviders = (providers: TmdbWatchProviders | null): WhereToWatch | null => {
  const results = providers?.results ?? {};
  const region = PREFERRED_REGIONS.find((r) => results[r]) ?? Object.keys(results)[0];
  if (!region) return null;
  const data = results[region];
  if (!data) return null;
  const toProvider = (list: TmdbWatchProviders["results"][string]["flatrate"]): WatchProvider[] =>
    formatWatchProviders(list, img);
  return {
    region,
    link: data.link ?? null,
    flatrate: toProvider(data.flatrate),
    rent: toProvider(data.rent),
    buy: toProvider(data.buy),
  };
};

const mapOmdbRatings = (
  omdb: OmdbMovieDetails | OmdbSeriesDetails | null,
): { ratings: ExternalRating[]; awards: string | null } => {
  if (!omdb) return { ratings: [], awards: null };
  const ratings: ExternalRating[] = [];
  if (omdb.imdbRating && omdb.imdbRating !== NA) {
    ratings.push({ source: "IMDb", value: `${omdb.imdbRating}/10` });
  }
  for (const r of omdb.Ratings ?? []) {
    if (r.Source === "Rotten Tomatoes") {
      ratings.push({ source: "Rotten Tomatoes", value: r.Value });
    }
  }
  const awards = omdb.Awards && omdb.Awards !== NA ? omdb.Awards : null;
  return { ratings, awards };
};

// ----- server functions -------------------------------------------------------

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

export const searchMulti = createServerFn({ method: "GET" })
  .validator((query: string) => query)
  .handler(async ({ data }) => {
    const query = data?.trim();
    if (!query) return { query: "", results: [] as SearchItem[] };
    const tmdb = getTmdb();
    const response = await tmdb.multiSearch(query);
    const results = response.results
      .map(fromMulti)
      .filter((item): item is SearchItem => item !== null);
    return { query, results };
  });

export const getMovieDetail = createServerFn({ method: "GET" })
  .validator((id: number) => id)
  .handler(
    async ({ data: id }): Promise<MediaDetail> =>
      cached(`movie-detail:${id}`, TTL.day, async () => {
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
          ? ((await omdb
              .getById({ imdbId: details.imdb_id })
              .catch(() => null)) as OmdbMovieDetails | null)
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
      }),
  );

export const getTvDetail = createServerFn({ method: "GET" })
  .validator((id: number) => id)
  .handler(
    async ({ data: id }): Promise<MediaDetail> =>
      cached(`tv-detail:${id}`, TTL.day, async () => {
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
          .catch(() => null)) as OmdbSeriesDetails | null;
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

const shapeMovie = (
  d: TmdbMovieDetails,
  credits: TmdbCredits | null,
  providers: TmdbWatchProviders | null,
  videos: TmdbVideosResponse | null,
  ratings: ExternalRating[],
  awards: string | null,
  imdbId: string | undefined,
  similar: MediaItem[],
): MediaDetail => ({
  id: d.id,
  mediaType: "movie",
  title: d.title,
  tagline: d.tagline ?? "",
  year: extractYear(d.release_date),
  overview: d.overview ?? "",
  runtime: d.runtime ? `${d.runtime} min` : null,
  genres: d.genres.map((g) => g.name),
  posterUrl: img(d.poster_path, "w500"),
  backdropUrl: img(d.backdrop_path, "w1280"),
  tmdbRating: d.vote_average,
  tmdbVotes: d.vote_count,
  status: d.status,
  cast: mapCast(credits),
  directors: crewNames(credits, ["Director"]),
  writers: crewNames(credits, ["Screenplay", "Writer", "Story"]),
  trailerUrl: firstTrailerUrl(videos),
  whereToWatch: mapProviders(providers),
  ratings,
  awards,
  imdbId,
  similar,
});

const shapeTv = (
  d: TmdbTvDetails,
  credits: TmdbCredits | null,
  providers: TmdbWatchProviders | null,
  videos: TmdbVideosResponse | null,
  ratings: ExternalRating[],
  awards: string | null,
  imdbId: string | undefined,
  similar: MediaItem[],
): MediaDetail => ({
  id: d.id,
  mediaType: "tv",
  title: d.name,
  tagline: d.tagline ?? "",
  year: extractYear(d.first_air_date),
  overview: d.overview ?? "",
  runtime: d.episode_run_time?.[0] ? `${d.episode_run_time[0]} min` : null,
  genres: d.genres.map((g) => g.name),
  posterUrl: img(d.poster_path, "w500"),
  backdropUrl: img(d.backdrop_path, "w1280"),
  tmdbRating: d.vote_average,
  tmdbVotes: d.vote_count,
  status: d.status,
  cast: mapCast(credits),
  directors: (d.created_by ?? []).map((c) => c.name),
  writers: [],
  trailerUrl: firstTrailerUrl(videos),
  whereToWatch: mapProviders(providers),
  ratings,
  awards,
  seasons: d.number_of_seasons,
  episodes: d.number_of_episodes,
  networks: (d.networks ?? []).map((n) => n.name),
  imdbId,
  similar,
});

const parseRating = (value: string): number | null => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/** Shape OMDB season responses into the heatmap structure, sorted and cleaned. */
const shapeEpisodeRatings = (seasons: OmdbSeasonResponse[]): EpisodeRatingsData => {
  const shaped = seasons
    .map((season) => {
      const episodes = season.Episodes.map((ep) => ({
        episode: Number.parseInt(ep.Episode, 10),
        title: ep.Title,
        rating: parseRating(ep.imdbRating),
        airDate: ep.Released,
      }))
        .filter((ep) => Number.isFinite(ep.episode))
        .sort((a, b) => a.episode - b.episode);

      const rated = episodes.filter((ep) => ep.rating !== null);
      const average = rated.length
        ? rated.reduce((sum, ep) => sum + (ep.rating ?? 0), 0) / rated.length
        : null;

      return {
        season: Number.parseInt(season.Season, 10),
        average,
        episodes,
      };
    })
    .filter((season) => Number.isFinite(season.season) && season.episodes.length)
    .sort((a, b) => a.season - b.season);

  const maxEpisodes = shaped.reduce(
    (max, season) => Math.max(max, ...season.episodes.map((episode) => episode.episode)),
    0,
  );

  return { seasons: shaped, maxEpisodes };
};
