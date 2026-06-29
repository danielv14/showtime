// TMDB API Response Types

// Configuration
export interface TmdbConfiguration {
  images: {
    base_url: string;
    secure_base_url: string;
    poster_sizes: string[];
    backdrop_sizes: string[];
    profile_sizes: string[];
  };
}

// Search Results
export interface TmdbMovieSearchResult {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  release_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  adult: boolean;
}

export interface TmdbSearchResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

// Person
export interface TmdbPersonSearchResult {
  id: number;
  name: string;
  known_for_department: string;
  profile_path: string | null;
  known_for: TmdbMovieSearchResult[];
}

export interface TmdbPersonDetails {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  profile_path: string | null;
  imdb_id: string | null;
  known_for_department: string;
}

// Credits
export interface TmdbMovieCredit {
  id: number;
  title: string;
  original_title: string;
  release_date: string;
  poster_path: string | null;
  vote_average: number;
  vote_count: number;
  character?: string; // For cast
  job?: string; // For crew
  department?: string; // For crew
  credit_id: string;
}

export interface TmdbPersonMovieCredits {
  id: number;
  cast: TmdbMovieCredit[];
  crew: TmdbMovieCredit[];
}

// Movie Details
export interface TmdbMovieDetails {
  id: number;
  imdb_id: string | null;
  title: string;
  original_title: string;
  overview: string;
  tagline: string;
  release_date: string;
  runtime: number | null;
  budget: number;
  revenue: number;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  genres: { id: number; name: string }[];
  production_companies: {
    id: number;
    name: string;
    logo_path: string | null;
  }[];
  production_countries: { iso_3166_1: string; name: string }[];
  spoken_languages: { iso_639_1: string; name: string }[];
  status: string;
  belongs_to_collection: {
    id: number;
    name: string;
    poster_path: string | null;
    backdrop_path: string | null;
  } | null;
}

// Cast & Crew
export interface TmdbCastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface TmdbCrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
}

export interface TmdbCredits {
  id: number;
  cast: TmdbCastMember[];
  crew: TmdbCrewMember[];
}

// Watch Providers
export interface TmdbWatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

export interface TmdbWatchProviderRegion {
  link: string;
  flatrate?: TmdbWatchProvider[]; // Subscription streaming
  rent?: TmdbWatchProvider[]; // Rent
  buy?: TmdbWatchProvider[]; // Buy
  free?: TmdbWatchProvider[]; // Free with ads
}

export interface TmdbWatchProviders {
  id: number;
  results: Record<string, TmdbWatchProviderRegion>; // Keyed by country code (US, GB, etc.)
}

// Discover Filters
export interface DiscoverMoviesOptions {
  page?: number;
  sort_by?:
    | "popularity.desc"
    | "popularity.asc"
    | "release_date.desc"
    | "release_date.asc"
    | "vote_average.desc"
    | "vote_average.asc"
    | "revenue.desc"
    | "revenue.asc";
  year?: number;
  primary_release_year?: number;
  with_genres?: string; // Comma-separated genre IDs
  without_genres?: string;
  with_people?: string; // Comma-separated person IDs (AND), pipe-separated (OR)
  with_crew?: string; // Comma-separated person IDs
  with_cast?: string; // Comma-separated person IDs
  vote_average_gte?: number;
  vote_average_lte?: number;
  vote_count_gte?: number;
  with_runtime_gte?: number;
  with_runtime_lte?: number;
  with_original_language?: string; // ISO 639-1 code
}

// Genre reference
export interface TmdbGenre {
  id: number;
  name: string;
}

// Find by external ID response
export interface TmdbFindResponse {
  movie_results: TmdbMovieDetails[];
  person_results: TmdbPersonDetails[];
  tv_results: unknown[];
  tv_episode_results: unknown[];
  tv_season_results: unknown[];
}

// Error response
export interface TmdbErrorResponse {
  success: false;
  status_code: number;
  status_message: string;
}

// Trending
export type TmdbTimeWindow = "day" | "week";
export type TmdbMediaType = "movie" | "tv" | "all";

// TV Series
export interface TmdbTvSearchResult {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  first_air_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
}

export interface TmdbTvDetails {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  tagline: string;
  first_air_date: string;
  last_air_date: string;
  number_of_seasons: number;
  number_of_episodes: number;
  episode_run_time: number[];
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  genres: { id: number; name: string }[];
  networks: { id: number; name: string; logo_path: string | null }[];
  production_companies: {
    id: number;
    name: string;
    logo_path: string | null;
  }[];
  status: string;
  type: string;
  in_production: boolean;
  created_by: { id: number; name: string; profile_path: string | null }[];
}

// Collection (movie franchise)
export interface TmdbCollectionDetails {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  parts: TmdbMovieSearchResult[];
}

// Combined trending result (can be movie or TV)
export interface TmdbTrendingResult {
  id: number;
  media_type: "movie" | "tv";
  // Movie fields
  title?: string;
  original_title?: string;
  release_date?: string;
  // TV fields
  name?: string;
  original_name?: string;
  first_air_date?: string;
  // Common fields
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
}

// Multi-search result (can be movie, TV, or person)
export interface TmdbMultiSearchResult {
  id: number;
  media_type: "movie" | "tv" | "person";
  // Movie fields
  title?: string;
  original_title?: string;
  release_date?: string;
  // TV fields
  name?: string;
  original_name?: string;
  first_air_date?: string;
  // Person fields
  known_for_department?: string;
  known_for?: TmdbMovieSearchResult[];
  // Common fields
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  profile_path?: string | null;
  vote_average?: number;
  vote_count?: number;
  genre_ids?: number[];
}

// Video result (trailers, teasers, etc.)
export interface TmdbVideo {
  id: string;
  key: string; // YouTube/Vimeo key
  name: string;
  site: string; // "YouTube", "Vimeo"
  size: number; // 360, 480, 720, 1080
  type: string; // "Trailer", "Teaser", "Clip", "Behind the Scenes", "Featurette"
  official: boolean;
  published_at: string;
  iso_639_1: string;
  iso_3166_1: string;
}

export interface TmdbVideosResponse {
  id: number;
  results: TmdbVideo[];
}

// Reviews
export interface TmdbReview {
  id: string;
  author: string;
  author_details: {
    name: string;
    username: string;
    avatar_path: string | null;
    rating: number | null;
  };
  content: string;
  created_at: string;
  updated_at: string;
  url: string;
}

export interface TmdbReviewsResponse {
  id: number;
  page: number;
  results: TmdbReview[];
  total_pages: number;
  total_results: number;
}

// Discover TV options
export interface DiscoverTvOptions {
  page?: number;
  sort_by?:
    | "popularity.desc"
    | "popularity.asc"
    | "first_air_date.desc"
    | "first_air_date.asc"
    | "vote_average.desc"
    | "vote_average.asc";
  first_air_date_year?: number;
  with_genres?: string;
  without_genres?: string;
  with_networks?: string;
  vote_average_gte?: number;
  vote_average_lte?: number;
  vote_count_gte?: number;
  with_runtime_gte?: number;
  with_runtime_lte?: number;
  with_original_language?: string;
  with_status?: string; // 0: Returning, 1: Planned, 2: In Production, 3: Ended, 4: Cancelled, 5: Pilot
  with_type?: string; // 0: Documentary, 1: News, 2: Miniseries, 3: Reality, 4: Scripted, 5: Talk Show, 6: Video
}
