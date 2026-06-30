// OMDB API Response Types

export interface OmdbSearchResult {
  Title: string;
  Year: string;
  imdbID: string;
  Type: "movie" | "series" | "episode";
  Poster: string;
}

export interface OmdbSearchResponse {
  Search: OmdbSearchResult[];
  totalResults: string;
  Response: "True";
}

export interface OmdbErrorResponse {
  Response: "False";
  Error: string;
}

export interface OmdbRating {
  Source: string;
  Value: string;
}

export interface OmdbBaseDetails {
  Title: string;
  Year: string;
  Rated: string;
  Released: string;
  Runtime: string;
  Genre: string;
  Director: string;
  Writer: string;
  Actors: string;
  Plot: string;
  Language: string;
  Country: string;
  Awards: string;
  Poster: string;
  Ratings: OmdbRating[];
  Metascore: string;
  imdbRating: string;
  imdbVotes: string;
  imdbID: string;
  Response: "True";
}

export interface OmdbMovieDetails extends OmdbBaseDetails {
  Type: "movie";
  DVD?: string;
  BoxOffice?: string;
  Production?: string;
  Website?: string;
}

export interface OmdbSeriesDetails extends OmdbBaseDetails {
  Type: "series";
  totalSeasons: string;
}

export interface OmdbEpisodeDetails extends OmdbBaseDetails {
  Type: "episode";
  Season: string;
  Episode: string;
  seriesID: string;
}

export interface OmdbSeasonEpisode {
  Title: string;
  Released: string;
  Episode: string;
  imdbRating: string;
  imdbID: string;
}

export interface OmdbSeasonResponse {
  Title: string;
  Season: string;
  totalSeasons: string;
  Episodes: OmdbSeasonEpisode[];
  Response: "True";
}

export type OmdbDetailsResponse = OmdbMovieDetails | OmdbSeriesDetails | OmdbEpisodeDetails;

export type OmdbResponse = OmdbSearchResponse | OmdbDetailsResponse | OmdbErrorResponse;

export type PlotLength = "short" | "full";
export type ContentType = "movie" | "series" | "episode";
