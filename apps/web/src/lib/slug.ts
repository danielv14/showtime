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

/** Build a `title-id` slug, falling back to the bare id when the title is empty. */
const toSlug = (id: number, title: string): string => {
  const base = slugify(title);
  return base ? `${base}-${id}` : String(id);
};

/**
 * Extract the trailing TMDB id from a hybrid `title-id` slug. The id is the
 * trailing `-<number>`, so a bare numeric slug (`603`) and an old-style URL both
 * still resolve. Generic over the entity kind — movies, TV, and people all share
 * the same trailing-id convention.
 *
 * Returns `null` when the trailing segment is not a positive integer (e.g.
 * `the-matrix` or a truncated/bot-crawled URL), so callers can render a clean
 * not-found instead of querying TMDB for `.../NaN`.
 */
export const parseTrailingId = (slug: string): number | null => {
  const id = Number(slug.split("-").at(-1));
  return Number.isInteger(id) && id > 0 ? id : null;
};

/** Build the URL segment for a movie or TV item: `the-matrix-603`. */
export const toMediaSlug = ({ id, title }: { id: number; title: string }): string =>
  toSlug(id, title);

/** Extract the TMDB id from a movie or TV slug. */
export const parseMediaId = (slug: string): number | null => parseTrailingId(slug);

/** Build the URL segment for a person: `greta-gerwig-45400`. */
export const toPersonSlug = ({ id, name }: { id: number; name: string }): string =>
  toSlug(id, name);

/** Extract the TMDB person id from a person slug. */
export const parsePersonId = (slug: string): number | null => parseTrailingId(slug);
