/** Helpers for turning a trailer watch URL into an embeddable YouTube player. */

/**
 * Pull the YouTube video id out of a watch URL. `selectTrailerUrl` only ever
 * returns `https://www.youtube.com/watch?v=KEY`, but we parse defensively and
 * return null on anything we don't recognise so the caller can fall back to the
 * plain external link rather than rendering a broken player.
 */
export const youtubeVideoId = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "youtu.be") {
      return parsed.pathname.slice(1) || null;
    }
    if (parsed.hostname.endsWith("youtube.com")) {
      return parsed.searchParams.get("v");
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * The embed URL for the modal player. `autoplay=1` only ever applies here, and
 * the iframe is mounted solely while the modal is open (after a user click), so
 * nothing autoplays on initial page load. `rel=0` keeps related videos scoped
 * to the same channel.
 */
export const youtubeEmbedUrl = (videoId: string): string =>
  `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
