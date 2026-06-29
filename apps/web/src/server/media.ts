import { createServerFn } from "@tanstack/react-start";
import {
  extractYear,
  type TmdbMovieSearchResult,
  type TmdbTrendingResult,
  type TmdbMultiSearchResult,
  type TmdbCredits,
  type TmdbWatchProviders,
  type TmdbVideosResponse,
  type TmdbMovieDetails,
  type TmdbTvDetails,
  type OmdbMovieDetails,
  type OmdbSeriesDetails,
} from "@showtime/core";
import { getOmdb, getTmdb } from "./clients";

const IMAGE_BASE = "https://image.tmdb.org/t/p";
const POSTER_SIZE = "w342";
const BACKDROP_SIZE = "w1280";
const PROFILE_SIZE = "w185";

/** Build a public TMDB image URL. The image CDN is public; no secret involved. */
const img = (
  path: string | null | undefined,
  size: string
): string | null => (path ? `${IMAGE_BASE}/${size}${path}` : null);

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
  // TV-only extras
  seasons?: number;
  episodes?: number;
  networks?: string[];
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

const fromTrending = (r: TmdbTrendingResult): MediaItem => ({
  id: r.id,
  mediaType: r.media_type,
  title: r.title ?? r.name ?? "Untitled",
  year: extractYear(r.release_date ?? r.first_air_date),
  rating: r.vote_average,
  posterUrl: img(r.poster_path, POSTER_SIZE),
  backdropUrl: img(r.backdrop_path, BACKDROP_SIZE),
  overview: r.overview ?? "",
});

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

const mapCast = (credits: TmdbCredits | null): CastMember[] =>
  (credits?.cast ?? []).slice(0, 14).map((c) => ({
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
    results.find(
      (v) => v.site === "YouTube" && v.type === "Trailer" && v.official
    ) ??
    results.find((v) => v.site === "YouTube" && v.type === "Trailer") ??
    results.find((v) => v.site === "YouTube");
  return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;
};

const PREFERRED_REGIONS = ["SE", "US", "GB"];

const mapProviders = (
  providers: TmdbWatchProviders | null
): WhereToWatch | null => {
  const results = providers?.results ?? {};
  const region =
    PREFERRED_REGIONS.find((r) => results[r]) ?? Object.keys(results)[0];
  if (!region) return null;
  const data = results[region];
  if (!data) return null;
  const toProvider = (
    list: { provider_name: string; logo_path: string }[] | undefined
  ): WatchProvider[] =>
    (list ?? []).map((p) => ({
      name: p.provider_name,
      logoUrl: img(p.logo_path, "w92"),
    }));
  return {
    region,
    link: data.link ?? null,
    flatrate: toProvider(data.flatrate),
    rent: toProvider(data.rent),
    buy: toProvider(data.buy),
  };
};

const mapOmdbRatings = (
  omdb: OmdbMovieDetails | OmdbSeriesDetails | null
): { ratings: ExternalRating[]; awards: string | null } => {
  if (!omdb) return { ratings: [], awards: null };
  const ratings: ExternalRating[] = [];
  if (omdb.imdbRating && omdb.imdbRating !== "N/A") {
    ratings.push({ source: "IMDb", value: `${omdb.imdbRating}/10` });
  }
  for (const r of omdb.Ratings ?? []) {
    if (r.Source === "Rotten Tomatoes") {
      ratings.push({ source: "Rotten Tomatoes", value: r.Value });
    }
  }
  if (omdb.Metascore && omdb.Metascore !== "N/A") {
    ratings.push({ source: "Metacritic", value: `${omdb.Metascore}/100` });
  }
  const awards = omdb.Awards && omdb.Awards !== "N/A" ? omdb.Awards : null;
  return { ratings, awards };
};

// ----- server functions -------------------------------------------------------

export const getHomeData = createServerFn({ method: "GET" }).handler(
  async () => {
    const tmdb = getTmdb();
    const [trending, nowPlaying, upcoming] = await Promise.all([
      tmdb.getTrending("all", "week"),
      tmdb.getNowPlayingMovies(),
      tmdb.getUpcomingMovies(),
    ]);
    return {
      trending: trending.results.map(fromTrending),
      nowPlaying: nowPlaying.results.map(fromMovie),
      upcoming: upcoming.results.map(fromMovie),
    };
  }
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
  .handler(async ({ data: id }): Promise<MediaDetail> => {
    const tmdb = getTmdb();
    const omdb = getOmdb();
    const [details, credits, providers, videos] = await Promise.all([
      tmdb.getMovieDetails(id),
      tmdb.getMovieCredits(id).catch(() => null),
      tmdb.getWatchProviders(id).catch(() => null),
      tmdb.getMovieVideos(id).catch(() => null),
    ]);
    const omdbData = details.imdb_id
      ? ((await omdb
          .getById({ imdbId: details.imdb_id })
          .catch(() => null)) as OmdbMovieDetails | null)
      : null;
    const { ratings, awards } = mapOmdbRatings(omdbData);
    return shapeMovie(details, credits, providers, videos, ratings, awards);
  });

export const getTvDetail = createServerFn({ method: "GET" })
  .validator((id: number) => id)
  .handler(async ({ data: id }): Promise<MediaDetail> => {
    const tmdb = getTmdb();
    const omdb = getOmdb();
    const [details, credits, providers, videos] = await Promise.all([
      tmdb.getTvDetails(id),
      tmdb.getMovieCredits(id).catch(() => null), // movie/{id}/credits shape == tv credits
      tmdb.getTvWatchProviders(id).catch(() => null),
      tmdb.getTvVideos(id).catch(() => null),
    ]);
    const year = extractYear(details.first_air_date);
    const omdbData = (await omdb
      .getByTitle({
        title: details.name,
        type: "series",
        year: year !== "N/A" ? year : undefined,
      })
      .catch(() => null)) as OmdbSeriesDetails | null;
    const { ratings, awards } = mapOmdbRatings(omdbData);
    return shapeTv(details, credits, providers, videos, ratings, awards);
  });

const shapeMovie = (
  d: TmdbMovieDetails,
  credits: TmdbCredits | null,
  providers: TmdbWatchProviders | null,
  videos: TmdbVideosResponse | null,
  ratings: ExternalRating[],
  awards: string | null
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
});

const shapeTv = (
  d: TmdbTvDetails,
  credits: TmdbCredits | null,
  providers: TmdbWatchProviders | null,
  videos: TmdbVideosResponse | null,
  ratings: ExternalRating[],
  awards: string | null
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
});
