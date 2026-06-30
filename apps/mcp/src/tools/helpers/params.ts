import { z } from "zod";

/**
 * Shared zod schema fragments for fields that recur verbatim across tool
 * schemas. Referencing these keeps the wording from drifting tool to tool.
 * Tools with deliberately different variants (e.g. OMDB pagination, or a
 * region field with a different description) keep their own inline field.
 */

/** Standard TMDB pagination page field (20 results per page). */
export const pageParam = z
  .number()
  .min(1)
  .optional()
  .describe("Page number for pagination (20 results per page)");

/** Standard region field for region-specific TMDB results. */
export const regionParam = z
  .string()
  .optional()
  .describe(
    "ISO 3166-1 country code for regional results (e.g., 'US', 'GB', 'SE'). Defaults to US.",
  );
