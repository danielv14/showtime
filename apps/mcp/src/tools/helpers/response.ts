import { capTotalPages } from "@showtime/core";

export const createSuccessResponse = (data: unknown) => ({
  // Coerce undefined to null so the text content is always a string; a handler
  // that returns nothing would otherwise yield `text: undefined`.
  content: [{ type: "text" as const, text: JSON.stringify(data ?? null, null, 2) }],
});

export const createErrorResponse = (context: string, error: unknown) => ({
  content: [
    {
      type: "text" as const,
      text: `Error ${context}: ${error instanceof Error ? error.message : "Unknown error occurred"}`,
    },
  ],
  isError: true,
});

/**
 * Normalised pagination counts a paginated tool result carries, regardless of
 * which upstream produced it. Each source (TMDB's `total_results`/`total_pages`
 * wire shape, OMDB's per-page count) is adapted into this one shape before it
 * reaches {@link createPaginatedResponse}.
 */
export interface Pagination {
  page: number;
  totalPages: number;
  totalResults: number;
}

/**
 * Create a success response with the standard pagination fields. This is the one
 * place that caps `totalPages` and names the output fields, so no tool hand-rolls
 * them.
 */
export const createPaginatedResponse = (pagination: Pagination, data: Record<string, unknown>) =>
  createSuccessResponse({
    ...data,
    totalResults: pagination.totalResults,
    page: pagination.page,
    totalPages: capTotalPages(pagination.totalPages),
  });
