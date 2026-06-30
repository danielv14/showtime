import { NA } from "@showtime/core";
import type { MediaDetail, PersonDetail } from "../server/media";
import type { BrowseFilters } from "../server/browse";
import type { SearchType } from "../server/search";

const SITE = "Showtime";

const truncate = (text: string, max = 160): string =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;

/** Title + Open Graph / Twitter meta for a movie or TV detail page. */
export const mediaMeta = (detail: MediaDetail) => {
  const yearSuffix = detail.year !== NA ? ` (${detail.year})` : "";
  const title = `${detail.title}${yearSuffix} — ${SITE}`;
  const description = detail.overview
    ? truncate(detail.overview)
    : `Find ratings and where to watch ${detail.title} on ${SITE}.`;
  const image = detail.backdropUrl ?? detail.posterUrl;

  const meta = [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    {
      property: "og:type",
      content: detail.mediaType === "tv" ? "video.tv_show" : "video.movie",
    },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
  ];

  if (image) {
    meta.push({ property: "og:image", content: image });
    meta.push({ name: "twitter:image", content: image });
  }

  return meta;
};

/** Title + Open Graph / Twitter meta for a person page. */
export const personMeta = (person: PersonDetail) => {
  const title = `${person.name} — ${SITE}`;
  const description = person.biography
    ? truncate(person.biography)
    : `Explore the filmography of ${person.name} on ${SITE}.`;
  const image = person.profileUrl;

  const meta = [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "profile" },
    { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
  ];

  if (image) {
    meta.push({ property: "og:image", content: image });
    meta.push({ name: "twitter:image", content: image });
  }

  return meta;
};

/**
 * Title + Open Graph / Twitter meta for a browse view, reflecting the active
 * filters so a filtered URL (e.g. "Action Movies — Showtime") indexes and
 * previews sensibly. `genreName` is the resolved genre label, when one is set.
 */
export const browseMeta = ({
  mediaNoun,
  filters,
  genreName,
}: {
  mediaNoun: "Movies" | "TV Shows";
  filters: BrowseFilters;
  genreName?: string | null;
}) => {
  const qualifiers = [
    filters.minRating ? `${filters.minRating}+ rated` : null,
    genreName ?? null,
  ].filter(Boolean);
  const subject = [...qualifiers, mediaNoun].join(" ");
  const yearSuffix = filters.year ? ` from ${filters.year}` : "";
  const title = `${subject}${yearSuffix} — ${SITE}`;
  const description = `Browse ${subject.toLowerCase()}${yearSuffix} on ${SITE}. Filter by genre, rating, and year, and sort to find your next watch.`;

  return [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
  ];
};

const SEARCH_TYPE_NOUNS: Record<SearchType, string | null> = {
  all: null,
  movie: "Movies",
  tv: "TV Shows",
  person: "People",
};

/**
 * Title + meta for the search page, reflecting the current query and (where
 * narrowed) the active type, so a shared search link previews meaningfully.
 */
export const searchMeta = (query: string, type: SearchType = "all") => {
  const typeNoun = SEARCH_TYPE_NOUNS[type];
  const scope = typeNoun ? ` in ${typeNoun}` : "";
  const title = query ? `“${query}”${scope} — Search — ${SITE}` : `Search — ${SITE}`;
  const description = query
    ? `Search results for “${query}”${scope} on ${SITE}.`
    : `Search movies, TV shows and people on ${SITE}.`;
  return [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
  ];
};
