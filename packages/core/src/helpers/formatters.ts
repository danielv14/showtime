import type {
  TmdbMovieSearchResult,
  TmdbTvSearchResult,
  TmdbReview,
  TmdbVideo,
  TmdbWatchProvider,
  TmdbVideosResponse,
  TmdbWatchProviders,
  TmdbWatchProviderRegion,
} from "../tmdb/types.js";
import type { OmdbSeasonEpisode, OmdbMovieDetails, OmdbSeriesDetails } from "../omdb/types.js";
import { NA } from "./constants.js";

export const truncateText = (text: string, maxLength: number): string =>
  text.length > maxLength ? text.substring(0, maxLength) + "..." : text;

export const extractYear = (releaseDate: string | undefined | null): string =>
  releaseDate?.split("-")[0] || NA;

export const formatOmdbEpisode = (episode: OmdbSeasonEpisode) => ({
  title: episode.Title,
  episode: episode.Episode,
  released: episode.Released,
  imdbRating: episode.imdbRating,
  imdbId: episode.imdbID,
});

export const formatTmdbMovieResult = (
  movie: TmdbMovieSearchResult,
  getImageUrl: (path: string | null, size?: string) => string | null,
  options?: { includeVoteCount?: boolean },
) => ({
  tmdbId: movie.id,
  title: movie.title,
  year: extractYear(movie.release_date),
  releaseDate: movie.release_date || NA,
  overview: truncateText(movie.overview || "", 200),
  tmdbRating: movie.vote_average,
  ...(options?.includeVoteCount && { voteCount: movie.vote_count }),
  posterUrl: getImageUrl(movie.poster_path, "w342"),
});

export const formatTmdbTvResult = (
  show: TmdbTvSearchResult,
  getImageUrl: (path: string | null, size?: string) => string | null,
  options?: { includeVoteCount?: boolean },
) => ({
  tmdbId: show.id,
  name: show.name,
  year: extractYear(show.first_air_date),
  firstAirDate: show.first_air_date || NA,
  overview: truncateText(show.overview || "", 200),
  tmdbRating: show.vote_average,
  ...(options?.includeVoteCount && { voteCount: show.vote_count }),
  posterUrl: getImageUrl(show.poster_path, "w342"),
});

/** A watch provider shaped for display: its name and a logo URL (or null). */
export interface FormattedWatchProvider {
  name: string;
  logoUrl: string | null;
}

/**
 * Shape a single TMDB watch provider into `{ name, logoUrl }`, building the
 * logo URL via the passed `getImageUrl` callback so the CDN base and the "w92"
 * size stay defined in one place.
 */
export const formatWatchProvider = (
  provider: TmdbWatchProvider,
  getImageUrl: (path: string | null, size?: string) => string | null,
): FormattedWatchProvider => ({
  name: provider.provider_name,
  logoUrl: getImageUrl(provider.logo_path, "w92"),
});

/** Shape a list of TMDB watch providers; an absent list becomes an empty array. */
export const formatWatchProviders = (
  providers: TmdbWatchProvider[] | undefined,
  getImageUrl: (path: string | null, size?: string) => string | null,
): FormattedWatchProvider[] =>
  (providers ?? []).map((provider) => formatWatchProvider(provider, getImageUrl));

export const formatReview = (review: TmdbReview) => ({
  id: review.id,
  author: review.author,
  username: review.author_details.username,
  rating: review.author_details.rating,
  content: truncateText(review.content, 1000),
  createdAt: review.created_at,
  url: review.url,
});

/** Build a YouTube watch URL from a video key. One source of truth for the form. */
const youtubeWatchUrl = (key: string): string => `https://www.youtube.com/watch?v=${key}`;

export const formatVideo = (video: TmdbVideo) => {
  const videoUrl =
    video.site === "YouTube"
      ? youtubeWatchUrl(video.key)
      : video.site === "Vimeo"
        ? `https://vimeo.com/${video.key}`
        : null;

  return {
    id: video.id,
    name: video.name,
    type: video.type,
    site: video.site,
    key: video.key,
    url: videoUrl,
    size: video.size,
    official: video.official,
    publishedAt: video.published_at,
  };
};

/**
 * The minimal crew-credit shape the classification helpers read. Both
 * `TmdbCrewMember` (movie credits) and `TmdbMovieCredit` (a person's filmography
 * crew entries, where `job`/`department` are optional) satisfy it, so the same
 * writer/director/producer rule applies on every surface.
 */
export interface CrewLike {
  id: number;
  job?: string;
  department?: string;
}

/**
 * Canonical "writer" job titles. The Writing department also covers jobs such as
 * "Story", "Author" and "Novel", so {@link crewWriters} unions these jobs with
 * the whole Writing department to avoid dropping any writing credit. "Story" is
 * listed here so a credit tagged with the Story job is matched even if the
 * upstream omits its department.
 */
export const WRITER_JOBS = ["Screenplay", "Writer", "Story"] as const;

/**
 * The single, inclusive "is this a writing credit?" rule: a {@link WRITER_JOBS}
 * job OR a Writing department credit. Every surface (get-movie, get-filmography,
 * the web shaper) classifies writers through this one predicate so the
 * definition never drifts between them.
 */
export const isWriterCredit = (member: CrewLike): boolean =>
  (member.job !== undefined && (WRITER_JOBS as readonly string[]).includes(member.job)) ||
  member.department === "Writing";

/** Filter crew members by specific job titles */
export const filterCrewByJob = <T extends CrewLike>(crew: T[], jobs: readonly string[]): T[] =>
  crew.filter((member) => member.job !== undefined && jobs.includes(member.job));

/** Filter crew members by department */
export const filterCrewByDepartment = <T extends CrewLike>(crew: T[], department: string): T[] =>
  crew.filter((member) => member.department === department);

/** Dedupe crew entries by id, keeping the first occurrence's order. */
const dedupeById = <T extends CrewLike>(crew: T[]): T[] => {
  const seen = new Set<number>();
  return crew.filter((member) => {
    if (seen.has(member.id)) return false;
    seen.add(member.id);
    return true;
  });
};

/**
 * Select crew members matching any of the given jobs, deduped by id and keeping
 * the first occurrence's order. A single person credited under several matching
 * jobs (or listed twice by the upstream) appears once. Returns the full crew
 * objects so callers can read whichever fields they need (name, job, id, ...).
 */
export const crewByJob = <T extends CrewLike>(
  crew: T[] | undefined,
  jobs: readonly string[],
): T[] => dedupeById(filterCrewByJob(crew ?? [], jobs));

/**
 * Select writing-credit crew members per {@link isWriterCredit}, deduped by id,
 * listing {@link WRITER_JOBS} job matches first and then any remaining
 * Writing-department-only matches.
 */
export const crewWriters = <T extends CrewLike>(crew: T[] | undefined): T[] => {
  const list = crew ?? [];
  return dedupeById([
    ...filterCrewByJob(list, WRITER_JOBS),
    ...filterCrewByDepartment(list, "Writing"),
  ]);
};

/**
 * Pick the watch-provider data for the first preferred region present, then fall
 * back to the first region the upstream lists, else null. Returns the region key
 * alongside its data so callers can surface which region they resolved to.
 */
export const selectProviderRegion = (
  results: TmdbWatchProviders["results"] | undefined,
  preferred: string[],
): { region: string; data: TmdbWatchProviderRegion } | null => {
  const byRegion = results ?? {};
  const region = preferred.find((code) => byRegion[code]) ?? Object.keys(byRegion)[0];
  if (!region) return null;
  const data = byRegion[region];
  if (!data) return null;
  return { region, data };
};

/**
 * Pick the best watchable URL from a TMDB videos response: an official YouTube
 * trailer first, then any YouTube trailer, then any YouTube video. Returns the
 * YouTube watch URL, or null when there is no YouTube video.
 */
export const selectTrailerUrl = (videos: TmdbVideosResponse | null): string | null => {
  const results = videos?.results ?? [];
  const trailer =
    results.find((v) => v.site === "YouTube" && v.type === "Trailer" && v.official) ??
    results.find((v) => v.site === "YouTube" && v.type === "Trailer") ??
    results.find((v) => v.site === "YouTube");
  return trailer ? youtubeWatchUrl(trailer.key) : null;
};

/**
 * Extract the external ratings and awards a UI surfaces from OMDB details:
 * the IMDb rating as "{x}/10", the Rotten Tomatoes value from `Ratings[]`, and
 * the awards string when present. `N/A` placeholders are skipped, and non-Rotten
 * Tomatoes sources are ignored. An absent `omdb` yields empty ratings and no
 * awards.
 */
export const extractOmdbRatings = (
  omdb: OmdbMovieDetails | OmdbSeriesDetails | null,
): { ratings: { source: string; value: string }[]; awards: string | null } => {
  if (!omdb) return { ratings: [], awards: null };
  const ratings: { source: string; value: string }[] = [];
  if (omdb.imdbRating && omdb.imdbRating !== NA) {
    ratings.push({ source: "IMDb", value: `${omdb.imdbRating}/10` });
  }
  for (const rating of omdb.Ratings ?? []) {
    if (rating.Source === "Rotten Tomatoes") {
      ratings.push({ source: "Rotten Tomatoes", value: rating.Value });
    }
  }
  const awards = omdb.Awards && omdb.Awards !== NA ? omdb.Awards : null;
  return { ratings, awards };
};
