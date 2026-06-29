/**
 * Hybrid slugs for media detail routes: `the-matrix-603`.
 *
 * TMDB has no slug field and looks media up by numeric id, so the id always
 * lives at the trailing segment of the slug. The title part is purely cosmetic
 * and is safe to change or drop without breaking the URL.
 */

/** kebab-case a title: strip diacritics, lowercase, collapse non-alphanumerics. */
const slugify = (title: string): string =>
  title
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** Build the URL segment for a movie or TV item: `the-matrix-603`. */
export const toMediaSlug = ({ id, title }: { id: number; title: string }): string => {
  const base = slugify(title);
  return base ? `${base}-${id}` : String(id);
};

/**
 * Extract the TMDB id from a media slug. The id is the trailing `-<number>`,
 * so a bare numeric slug (`603`) and an old-style URL both still resolve.
 *
 * Returns `null` when the trailing segment is not a positive integer (e.g.
 * `the-matrix` or a truncated/bot-crawled URL), so callers can render a clean
 * not-found instead of querying TMDB for `movie/NaN`.
 */
export const parseMediaId = (slug: string): number | null => {
  const id = Number(slug.split("-").at(-1));
  return Number.isInteger(id) && id > 0 ? id : null;
};
