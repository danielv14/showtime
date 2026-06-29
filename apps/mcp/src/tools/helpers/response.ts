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

/** Create a success response with standard pagination fields */
export const createPaginatedResponse = (
  apiResponse: { total_results: number; page: number; total_pages: number },
  data: Record<string, unknown>,
) =>
  createSuccessResponse({
    ...data,
    totalResults: apiResponse.total_results,
    page: apiResponse.page,
    totalPages: capTotalPages(apiResponse.total_pages),
  });
