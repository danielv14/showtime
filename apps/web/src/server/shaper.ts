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

// Pure shaping module: maps core's upstream `Tmdb*` / `Omdb*` types into the
// UI-facing shapes that components consume. This module never fetches, caches,
// or reads secrets - it receives already-fetched data as arguments and returns
// plain values. Keep it free of `getTmdb()/getOmdb()/cached()` so it stays unit
// testable without crossing the network or cache.

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
  /**
   * Preformatted season count for display (e.g. "1 season", "3 seasons"), or
   * null for movies / when the season count is absent. Built here so components
   * render a ready string instead of assembling display text themselves.
   */
  seasonsLabel?: string | null;
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

export const fromMovie = (m: TmdbMovieSearchResult): MediaItem => ({
  id: m.id,
  mediaType: "movie",
  title: m.title,
  year: extractYear(m.release_date),
  rating: m.vote_average,
  posterUrl: img(m.poster_path, POSTER_SIZE),
  backdropUrl: img(m.backdrop_path, BACKDROP_SIZE),
  overview: m.overview ?? "",
});

export const fromTv = (t: TmdbTvSearchResult): MediaItem => ({
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
export const fromTrending = (r: TmdbTrendingResult): MediaItem | null => {
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

export const fromMulti = (r: TmdbMultiSearchResult): SearchItem | null => {
  if (r.media_type === "person") {
    return {
      id: r.id,
      mediaType: "person",
      name: r.name ?? r.title ?? "Unknown",
      department: r.known_for_department ?? "Acting",
      profileUrl: img(r.profile_path, PROFILE_SIZE),
      knownFor: (r.known_for ?? [])
        .map((k) => k.title ?? k.name)
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
 *
 * `currentYear` is injected so this stays pure and testable; the server fn
 * passes the real current year (the default), tests pass a fixed year. The
 * default keeps the ranking identical to the previous `new Date()` behavior for
 * the same date.
 */
export const rankSimilar = (
  items: MediaItem[],
  currentYear: number = new Date().getFullYear(),
): MediaItem[] => {
  const seen = new Set<number>();
  const pool = items
    .filter((item) => item.posterUrl)
    .filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)));
  if (pool.length <= 1) return pool.slice(0, SIMILAR_LIMIT);

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

export const firstTrailerUrl = (videos: TmdbVideosResponse | null): string | null => {
  const results = videos?.results ?? [];
  const trailer =
    results.find((v) => v.site === "YouTube" && v.type === "Trailer" && v.official) ??
    results.find((v) => v.site === "YouTube" && v.type === "Trailer") ??
    results.find((v) => v.site === "YouTube");
  return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;
};

const PREFERRED_REGIONS = ["SE", "US", "GB"];

export const mapProviders = (providers: TmdbWatchProviders | null): WhereToWatch | null => {
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

export const mapOmdbRatings = (
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

/** Build the preformatted season-count label (e.g. "1 season", "3 seasons"). */
const seasonsLabel = (seasons: number | undefined): string | null =>
  seasons ? `${seasons} season${seasons === 1 ? "" : "s"}` : null;

export const shapeMovie = (
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

export const shapeTv = (
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
  seasonsLabel: seasonsLabel(d.number_of_seasons),
  imdbId,
  similar,
});

const parseRating = (value: string): number | null => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/** Shape OMDB season responses into the heatmap structure, sorted and cleaned. */
export const shapeEpisodeRatings = (seasons: OmdbSeasonResponse[]): EpisodeRatingsData => {
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
