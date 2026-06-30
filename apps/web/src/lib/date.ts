/** Date formatting helpers shared across detail and person views. */

/**
 * Format a TMDB `YYYY-MM-DD` date as a readable `en-US` string ("March 31,
 * 1999"). Returns null for a missing value, and passes an unparseable value
 * through unchanged so a malformed date still renders something. Pinned to UTC
 * so the rendered day never shifts with the viewer's timezone.
 */
export const formatDate = (value: string | null): string | null => {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
};

/** "Born … — Died …" / "Born …", or null when no dates are known. */
export const lifespan = (birthday: string | null, deathday: string | null): string | null => {
  const born = formatDate(birthday);
  const died = formatDate(deathday);
  if (born && died) return `${born} — ${died}`;
  if (born) return born;
  if (died) return `Died ${died}`;
  return null;
};

/**
 * Format an episode air date for display. OMDB air dates arrive as "DD Mon
 * YYYY"; anything unparseable is passed through as-is. Uses the runtime's
 * default locale (short month) since episode lists are a secondary surface.
 */
export const formatAirDate = (airDate: string): string => {
  const parsed = new Date(airDate);
  if (Number.isNaN(parsed.getTime())) return airDate;
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};
