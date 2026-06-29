import type {
  TmdbMovieSearchResult,
  TmdbTvSearchResult,
  TmdbReview,
  TmdbVideo,
  TmdbCrewMember,
} from "../tmdb/types.js";
import type { OmdbSeasonEpisode } from "../omdb/types.js";
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

export const formatReview = (review: TmdbReview) => ({
  id: review.id,
  author: review.author,
  username: review.author_details.username,
  rating: review.author_details.rating,
  content: truncateText(review.content, 1000),
  createdAt: review.created_at,
  url: review.url,
});

export const formatVideo = (video: TmdbVideo) => {
  const videoUrl =
    video.site === "YouTube"
      ? `https://www.youtube.com/watch?v=${video.key}`
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

/** Filter crew members by specific job titles */
export const filterCrewByJob = (crew: TmdbCrewMember[], jobs: string[]) =>
  crew.filter((member) => jobs.includes(member.job));

/** Filter crew members by department */
export const filterCrewByDepartment = (crew: TmdbCrewMember[], department: string) =>
  crew.filter((member) => member.department === department);
