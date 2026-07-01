import {
  buildTmdbImageUrl as img,
  crewByJob,
  crewWriters,
  extractOmdbRatings,
  extractYear,
  formatReview,
  formatWatchProviders,
  selectProviderRegion,
  selectTrailerUrl,
  type TmdbEpisodeDetails,
  type TmdbMovieSearchResult,
  type TmdbTvSearchResult,
  type TmdbTrendingResult,
  type TmdbMultiSearchResult,
  type TmdbPersonSearchResult,
  type TmdbCredits,
  type TmdbWatchProviders,
  type TmdbVideosResponse,
  type TmdbMovieDetails,
  type TmdbTvDetails,
  type TmdbPersonDetails,
  type TmdbPersonCombinedCredits,
  type TmdbCombinedCredit,
  type TmdbCollectionDetails,
  type OmdbMovieDetails,
  type OmdbSeriesDetails,
  type OmdbSeasonResponse,
  type TmdbReviewsResponse,
} from "@showtime/core";

// Pure shaping module: maps core's upstream `Tmdb*` / `Omdb*` types into the
// UI-facing shapes that components consume. This module never fetches, caches,
// or reads secrets - it receives already-fetched data as arguments and returns
// plain values. Keep it free of `getTmdb()/getOmdb()/cached()` so it stays unit
// testable without crossing the network or cache.

const POSTER_SIZE = "w342";
const DETAIL_POSTER_SIZE = "w500";
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

/**
 * A named person carried alongside their TMDB id, so a director/creator/writer
 * credit on a detail page can link to that person's page rather than render a
 * dead name string.
 */
export interface CreditName {
  id: number;
  name: string;
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

/**
 * A genre on a detail page, carrying TMDB's id alongside the name so the tag can
 * link into the matching browse view pre-filtered to that genre.
 */
export interface MediaGenre {
  id: number;
  name: string;
}

/**
 * One user review on a detail page. `rating` is null when the author left no
 * score. `content` is already capped by core's `formatReview` (so a single
 * review cannot dominate the payload); the component handles display-level
 * truncation and expansion. `url` links to the full review on TMDB.
 */
export interface Review {
  id: string;
  author: string;
  rating: number | null;
  content: string;
  url: string;
}

/**
 * The collection (franchise) a movie belongs to, carried on its detail so the
 * page can link to the collection route. Just id + name; the route fetches the
 * full collection separately.
 */
export interface CollectionSummary {
  id: number;
  name: string;
}

/**
 * Whether external (OMDB) ratings could be fetched for a title.
 *
 * - `ok`: OMDB answered. `ratings` may still be empty when the title genuinely
 *   has no external ratings, or when there was no IMDb id to look it up by.
 * - `rate_limited`: OMDB's daily request quota was hit, so ratings could not be
 *   fetched right now. Temporary; the detail page says so rather than silently
 *   dropping the rating chips.
 * - `unavailable`: any other OMDB failure (outage, missing/invalid key) blocked
 *   the fetch.
 */
export type MediaRatingsStatus = "ok" | "rate_limited" | "unavailable";

export interface MediaDetail {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  tagline: string;
  year: string;
  overview: string;
  runtime: string | null;
  genres: MediaGenre[];
  posterUrl: string | null;
  backdropUrl: string | null;
  tmdbRating: number;
  tmdbVotes: number;
  status: string;
  cast: CastMember[];
  directors: CreditName[];
  writers: CreditName[];
  trailerUrl: string | null;
  whereToWatch: WhereToWatch | null;
  ratings: ExternalRating[];
  /**
   * Why external ratings are absent, when they are. Optional because payloads
   * cached before this field was introduced do not carry it; consumers treat a
   * missing value as "ok". Keeping it optional lets the field land without
   * bumping the cache version (which would force a full re-cache).
   */
  ratingsStatus?: MediaRatingsStatus;
  awards: string | null;
  similar: MediaItem[];
  reviews: Review[];
  imdbId?: string;
  /**
   * The franchise this movie belongs to, when any. Null for standalone movies
   * and for TV, so the detail page can omit the entry without a layout break.
   */
  collection?: CollectionSummary | null;
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

/**
 * Richer per-episode detail, loaded on demand when an episode is opened. The
 * list of episodes (number, title, air date, IMDb rating) is already streamed
 * with the ratings data, so this carries only the extra fields that fetch buys:
 * the plot synopsis and the billed cast.
 */
export interface EpisodeDetail {
  season: number;
  episode: number;
  title: string;
  airDate: string | null;
  rating: number | null;
  plot: string | null;
  cast: string[];
}

/**
 * One filmography entry on a person page. It is a superset of `MediaItem` so it
 * renders with the existing `MediaCard` (which links by media type), plus a
 * `role` label (the character played, or the crew job(s)) shown under the card.
 */
export interface PersonCredit extends MediaItem {
  role: string;
}

/** A role-grouped section of a person's filmography (e.g. "Acting", "Directing"). */
export interface FilmographySection {
  department: string;
  count: number;
  credits: PersonCredit[];
}

/** UI shape for a person page: identity header, "known for" row, filmography. */
export interface PersonDetail {
  id: number;
  name: string;
  profileUrl: string | null;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  placeOfBirth: string | null;
  knownForDepartment: string;
  imdbId: string | null;
  knownFor: PersonCredit[];
  filmography: FilmographySection[];
}

/**
 * UI shape for a collection (franchise) page: the franchise header plus its
 * movies in release order. `parts` reuses `MediaItem` so they render with the
 * existing `MediaCard` / `MediaGrid` and link to each movie's detail page.
 */
export interface CollectionDetail {
  id: number;
  name: string;
  overview: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  parts: MediaItem[];
}

// ----- mappers ----------------------------------------------------------------

/**
 * The fields a "movie-or-TV result" carries that `toMediaItem` reads. Movie
 * results use `title`/`release_date`, TV uses `name`/`first_air_date`, and the
 * trending/multi results carry both optionally, so the shared shape reads the
 * union and falls back across them. `TmdbMovieSearchResult`, `TmdbTvSearchResult`,
 * `TmdbTrendingResult` and the movie/tv branch of `TmdbMultiSearchResult` all
 * satisfy it structurally.
 */
interface MediaResult {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  poster_path?: string | null;
  backdrop_path?: string | null;
  overview?: string;
}

/**
 * The shared `MediaItem` builder behind `fromMovie`/`fromTv`/`fromTrending` and
 * the movie/tv branch of `fromMulti`. `mediaType` is passed by the caller (it is
 * hardcoded for the per-type builders, derived for trending/multi). The `?? 0`
 * rating fallback is a no-op for the per-type results (whose `vote_average` is
 * always present) and preserves `fromMulti`'s behaviour for optional ratings.
 */
const toMediaItem = (mediaType: "movie" | "tv", result: MediaResult): MediaItem => ({
  id: result.id,
  mediaType,
  title: result.title ?? result.name ?? "Untitled",
  year: extractYear(result.release_date ?? result.first_air_date),
  rating: result.vote_average ?? 0,
  posterUrl: img(result.poster_path, POSTER_SIZE),
  backdropUrl: img(result.backdrop_path, BACKDROP_SIZE),
  overview: result.overview ?? "",
});

/** The fields a person result carries that `toPersonItem` reads. */
interface PersonResult {
  id: number;
  name?: string;
  title?: string;
  known_for_department?: string;
  profile_path?: string | null;
  known_for?: { title?: string; name?: string }[];
}

/**
 * The shared `PersonItem` builder behind `fromPerson` and the person branch of
 * `fromMulti`. The per-type `/search/person` endpoint and multi-search return
 * the same person fields, so both build the same shape.
 */
const toPersonItem = (result: PersonResult): PersonItem => ({
  id: result.id,
  mediaType: "person",
  name: result.name ?? result.title ?? "Unknown",
  department: result.known_for_department ?? "Acting",
  profileUrl: img(result.profile_path, PROFILE_SIZE),
  knownFor: (result.known_for ?? [])
    .map((k) => k.title ?? k.name)
    .filter((t): t is string => Boolean(t))
    .slice(0, 3),
});

export const fromMovie = (m: TmdbMovieSearchResult): MediaItem => toMediaItem("movie", m);

export const fromTv = (t: TmdbTvSearchResult): MediaItem => toMediaItem("tv", t);

// Trending "all" also returns people; filter them out so they are not
// rendered or routed as movies or TV.
export const fromTrending = (r: TmdbTrendingResult): MediaItem | null => {
  if (r.media_type !== "movie" && r.media_type !== "tv") return null;
  return toMediaItem(r.media_type, r);
};

export const fromMulti = (r: TmdbMultiSearchResult): SearchItem | null => {
  if (r.media_type === "person") return toPersonItem(r);
  if (r.media_type === "movie" || r.media_type === "tv") return toMediaItem(r.media_type, r);
  return null;
};

// The per-type `/search/person` endpoint returns the same person fields
// `fromMulti`'s person branch reads, so this is a thin extraction to the shared
// `PersonItem` shape rather than new shaping logic.
export const fromPerson = (p: TmdbPersonSearchResult): PersonItem => toPersonItem(p);

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
    .filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
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

// crewByJob dedupes by id. We keep id alongside name so each credit can link to
// the person page; two distinct people who share a name stay separate (their ids
// differ), which is the correct behaviour once names become links.
const crewCredits = (credits: TmdbCredits | null, jobs: string[]): CreditName[] =>
  crewByJob(credits?.crew, jobs).map((member) => ({ id: member.id, name: member.name }));

// Writers use the shared inclusive rule (WRITER_JOBS or the Writing department),
// so the web surface, get-movie and get-filmography all classify writers the same way.
const writerCredits = (credits: TmdbCredits | null): CreditName[] =>
  crewWriters(credits?.crew).map((member) => ({ id: member.id, name: member.name }));

export const firstTrailerUrl = (videos: TmdbVideosResponse | null): string | null =>
  selectTrailerUrl(videos);

const PREFERRED_REGIONS = ["SE", "US", "GB"];

export const mapProviders = (providers: TmdbWatchProviders | null): WhereToWatch | null => {
  const selected = selectProviderRegion(providers?.results, PREFERRED_REGIONS);
  if (!selected) return null;
  const { region, data } = selected;
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
): { ratings: ExternalRating[]; awards: string | null } => extractOmdbRatings(omdb);

/** How many reviews the detail page renders; TMDB returns up to 20 per page. */
const REVIEW_LIMIT = 6;

/**
 * Shape a TMDB reviews response into the UI `Review` list. A failed reviews
 * fetch arrives as `null`, which becomes an empty list so the section is simply
 * omitted rather than breaking the page. Reviews with no text are dropped (their
 * card would render empty), and the list is capped so it does not dominate the
 * layout. Delegates per-review formatting to core's `formatReview`.
 */
export const shapeReviews = (reviews: TmdbReviewsResponse | null): Review[] =>
  (reviews?.results ?? [])
    .map(formatReview)
    .filter((review) => review.content.trim().length > 0)
    .slice(0, REVIEW_LIMIT)
    .map((review) => ({
      id: review.id,
      author: review.author,
      rating: review.rating,
      content: review.content,
      url: review.url,
    }));

/** Build the preformatted season-count label (e.g. "1 season", "3 seasons"). */
const seasonsLabel = (seasons: number | undefined): string | null =>
  seasons ? `${seasons} season${seasons === 1 ? "" : "s"}` : null;

/**
 * The ~18 fields `shapeMovie` and `shapeTv` build identically. Reads the 9 shared
 * raw fields straight off the TMDB movie/TV union; takes the already-resolved
 * extras as a second arg. The type-specific fields stay in their respective shaper.
 */
const shapeMediaCommon = (
  d: TmdbMovieDetails | TmdbTvDetails,
  extras: {
    credits: TmdbCredits | null;
    videos: TmdbVideosResponse | null;
    providers: TmdbWatchProviders | null;
    ratings: ExternalRating[];
    ratingsStatus: MediaRatingsStatus;
    awards: string | null;
    imdbId: string | undefined;
    similar: MediaItem[];
    reviews: Review[];
  },
) => ({
  id: d.id,
  tagline: d.tagline ?? "",
  overview: d.overview ?? "",
  genres: d.genres.map((g) => ({ id: g.id, name: g.name })),
  posterUrl: img(d.poster_path, DETAIL_POSTER_SIZE),
  backdropUrl: img(d.backdrop_path, BACKDROP_SIZE),
  tmdbRating: d.vote_average,
  tmdbVotes: d.vote_count,
  status: d.status,
  cast: mapCast(extras.credits),
  trailerUrl: firstTrailerUrl(extras.videos),
  whereToWatch: mapProviders(extras.providers),
  ratings: extras.ratings,
  ratingsStatus: extras.ratingsStatus,
  awards: extras.awards,
  imdbId: extras.imdbId,
  similar: extras.similar,
  reviews: extras.reviews,
});

export const shapeMovie = (
  d: TmdbMovieDetails,
  credits: TmdbCredits | null,
  providers: TmdbWatchProviders | null,
  videos: TmdbVideosResponse | null,
  ratings: ExternalRating[],
  awards: string | null,
  ratingsStatus: MediaRatingsStatus,
  imdbId: string | undefined,
  similar: MediaItem[],
  reviews: Review[],
): MediaDetail => ({
  ...shapeMediaCommon(d, {
    credits,
    videos,
    providers,
    ratings,
    ratingsStatus,
    awards,
    imdbId,
    similar,
    reviews,
  }),
  mediaType: "movie",
  title: d.title,
  year: extractYear(d.release_date),
  runtime: d.runtime ? `${d.runtime} min` : null,
  directors: crewCredits(credits, ["Director"]),
  writers: writerCredits(credits),
  collection: d.belongs_to_collection
    ? { id: d.belongs_to_collection.id, name: d.belongs_to_collection.name }
    : null,
});

export const shapeTv = (
  d: TmdbTvDetails,
  credits: TmdbCredits | null,
  providers: TmdbWatchProviders | null,
  videos: TmdbVideosResponse | null,
  ratings: ExternalRating[],
  awards: string | null,
  ratingsStatus: MediaRatingsStatus,
  imdbId: string | undefined,
  similar: MediaItem[],
  reviews: Review[],
): MediaDetail => ({
  ...shapeMediaCommon(d, {
    credits,
    videos,
    providers,
    ratings,
    ratingsStatus,
    awards,
    imdbId,
    similar,
    reviews,
  }),
  mediaType: "tv",
  title: d.name,
  year: extractYear(d.first_air_date),
  runtime: d.episode_run_time?.[0] ? `${d.episode_run_time[0]} min` : null,
  directors: (d.created_by ?? []).map((c) => ({ id: c.id, name: c.name })),
  writers: [],
  seasons: d.number_of_seasons,
  episodes: d.number_of_episodes,
  networks: (d.networks ?? []).map((n) => n.name),
  seasonsLabel: seasonsLabel(d.number_of_seasons),
});

/**
 * Shape a TMDB collection into the collection-page UI shape. Maps the franchise
 * header and orders `parts` by release date ascending (earliest first) so the
 * films read in release order. Entries with no release date sort to the bottom
 * rather than to 1970, and the order is otherwise stable.
 */
export const shapeCollection = (d: TmdbCollectionDetails): CollectionDetail => {
  // Sort on the raw release_date (full date, not just the year) so films from
  // the same year keep their true order; undated entries sort to the bottom.
  const parts = [...d.parts]
    .sort((a, b) => {
      if (!a.release_date) return 1;
      if (!b.release_date) return -1;
      return a.release_date.localeCompare(b.release_date);
    })
    .map(fromMovie);
  return {
    id: d.id,
    name: d.name,
    overview: d.overview ?? "",
    posterUrl: img(d.poster_path, DETAIL_POSTER_SIZE),
    backdropUrl: img(d.backdrop_path, BACKDROP_SIZE),
    parts,
  };
};

// ----- person shaping ---------------------------------------------------------

const PERSON_PROFILE_SIZE = "h632";
const KNOWN_FOR_LIMIT = 10;
/** Acting credits collapse into one section; crew credits group by department. */
const DEPT_ACTING = "Acting";

const creditTitle = (c: TmdbCombinedCredit): string => c.title ?? c.name ?? "Untitled";
const creditDate = (c: TmdbCombinedCredit): string => c.release_date ?? c.first_air_date ?? "";
const isMovieOrTv = (
  c: TmdbCombinedCredit,
): c is TmdbCombinedCredit & { media_type: "movie" | "tv" } =>
  c.media_type === "movie" || c.media_type === "tv";

/** Mutable accumulator while grouping; a title may carry several roles in a section. */
interface CreditAccum {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  date: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  rating: number;
  voteCount: number;
  roles: string[];
}

const toPersonCredit = (accum: CreditAccum, separator: string): PersonCredit => ({
  id: accum.id,
  mediaType: accum.mediaType,
  title: accum.title,
  year: extractYear(accum.date),
  rating: accum.rating,
  posterUrl: accum.posterUrl,
  backdropUrl: accum.backdropUrl,
  overview: "",
  role: accum.roles.filter(Boolean).join(separator),
});

/**
 * Order sections so the person's primary discipline leads, then the rest by how
 * much they did in each (count desc), with an alphabetical tiebreak for stability.
 */
const sectionOrder =
  (knownForDepartment: string) =>
  (a: FilmographySection, b: FilmographySection): number => {
    if (a.department === knownForDepartment) return -1;
    if (b.department === knownForDepartment) return 1;
    if (b.count !== a.count) return b.count - a.count;
    return a.department.localeCompare(b.department);
  };

/**
 * Shape a person's details + combined credits into the person-page UI shape.
 *
 * Pure and synchronous (the unit under test). It groups credits by role into
 * sections, de-duplicates a title that appears under several jobs within one
 * section (collapsing those jobs into a single role label), sorts each section
 * newest first, counts each section, and picks the "known for" highlights by
 * popularity (vote count). A pure director yields only a Directing section; a
 * pure actor only an Acting section; someone who does both yields both.
 */
export const shapePerson = (
  details: TmdbPersonDetails,
  credits: TmdbPersonCombinedCredits,
): PersonDetail => {
  const byDepartment = new Map<string, Map<number, CreditAccum>>();

  const add = (c: TmdbCombinedCredit, department: string, role: string): void => {
    if (!isMovieOrTv(c)) return;
    let group = byDepartment.get(department);
    if (!group) {
      group = new Map<number, CreditAccum>();
      byDepartment.set(department, group);
    }
    const existing = group.get(c.id);
    if (existing) {
      // Same title, different job within the section (e.g. wrote and produced):
      // keep one entry and merge the role labels rather than listing it twice.
      if (role && !existing.roles.includes(role)) existing.roles.push(role);
      return;
    }
    group.set(c.id, {
      id: c.id,
      mediaType: c.media_type,
      title: creditTitle(c),
      date: creditDate(c),
      posterUrl: img(c.poster_path, POSTER_SIZE),
      backdropUrl: img(c.backdrop_path, BACKDROP_SIZE),
      rating: c.vote_average ?? 0,
      voteCount: c.vote_count ?? 0,
      roles: role ? [role] : [],
    });
  };

  for (const c of credits.cast ?? []) add(c, DEPT_ACTING, (c.character ?? "").trim());
  for (const c of credits.crew ?? [])
    add(c, (c.department ?? "").trim() || "Crew", (c.job ?? "").trim());

  const departmentSeparator = (department: string): string =>
    department === DEPT_ACTING ? " / " : ", ";

  const filmography: FilmographySection[] = Array.from(byDepartment.entries())
    .map(([department, group]) => {
      const separator = departmentSeparator(department);
      const sectionCredits = Array.from(group.values())
        // Newest first; entries with no date ("") sort to the bottom.
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((accum) => toPersonCredit(accum, separator));
      return { department, count: sectionCredits.length, credits: sectionCredits };
    })
    .sort(sectionOrder((details.known_for_department ?? "").trim()));

  // "Known for": most popular titles by vote count, de-duped across cast + crew,
  // limited to ones with a poster so the highlights row stays visually clean.
  // Derived from the accumulators already built above rather than a second
  // traversal: filmography de-dupes within a department, so flatten across
  // departments, keep the highest-voted entry per id (departments are inserted
  // cast-first, so a tie keeps the acting credit), drop poster-less entries.
  const bestById = new Map<number, CreditAccum & { separator: string }>();
  for (const [department, group] of byDepartment) {
    const separator = departmentSeparator(department);
    for (const accum of group.values()) {
      if (!accum.posterUrl) continue;
      const existing = bestById.get(accum.id);
      if (existing && existing.voteCount >= accum.voteCount) continue;
      bestById.set(accum.id, { ...accum, separator });
    }
  }

  const knownFor = Array.from(bestById.values())
    .sort((a, b) => b.voteCount - a.voteCount)
    .slice(0, KNOWN_FOR_LIMIT)
    .map((accum) => toPersonCredit(accum, accum.separator));

  return {
    id: details.id,
    name: details.name,
    profileUrl: img(details.profile_path, PERSON_PROFILE_SIZE),
    biography: details.biography ?? "",
    birthday: details.birthday,
    deathday: details.deathday,
    placeOfBirth: details.place_of_birth,
    knownForDepartment: details.known_for_department ?? "",
    imdbId: details.imdb_id,
    knownFor,
    filmography,
  };
};

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

/**
 * Shape a TMDB episode response into the on-demand episode-detail UI shape.
 * TMDB has no per-request daily cap (unlike OMDB), so this powers the
 * open-an-episode fetch; cast is the episode's guest stars. The per-episode IMDb
 * score in the list/heatmap still comes from OMDB via the streamed ratings.
 */
export const shapeEpisodeDetail = (episode: TmdbEpisodeDetails): EpisodeDetail => ({
  season: episode.season_number,
  episode: episode.episode_number,
  title: episode.name,
  airDate: episode.air_date || null,
  rating: episode.vote_average > 0 ? episode.vote_average : null,
  plot: episode.overview.trim() ? episode.overview : null,
  cast: episode.guest_stars.map((star) => star.name).filter(Boolean),
});
