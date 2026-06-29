import { NA } from "@showtime/core";
import type { MediaDetail } from "../server/media";

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

/** Title + meta for the search page, reflecting the current query. */
export const searchMeta = (query: string) => {
  const title = query ? `“${query}” — Search — ${SITE}` : `Search — ${SITE}`;
  const description = query
    ? `Search results for “${query}” on ${SITE}.`
    : `Search movies, TV shows and people on ${SITE}.`;
  return [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
  ];
};
