import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { BrowseSearch } from "../server/browse";

/** Browse route paths the pagination can target. */
type BrowsePath = "/movies" | "/shows";

const linkClass =
  "inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-100 no-underline transition hover:bg-white/10";
const disabledClass =
  "inline-flex items-center gap-1 rounded-lg border border-white/5 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-600 cursor-not-allowed";

/**
 * Previous/next pagination that preserves the active filters and only changes
 * the `page` search param. Each side renders as a real `Link` (an `<a href>`, so
 * it works without JS); at a boundary it renders an inert span instead, so the
 * viewer is never offered page 0 or a page past the capped last page.
 */
export const Pagination = ({
  to,
  page,
  totalPages,
}: {
  to: BrowsePath;
  page: number;
  totalPages: number;
}) => {
  if (totalPages <= 1) return null;
  const hasPrev = page > 1;
  const hasNext = page < totalPages;
  // Drop `page` for page 1 so the URL stays clean; otherwise set it explicitly.
  const pageSearch = (target: number) => (prev: BrowseSearch) => ({
    ...prev,
    page: target === 1 ? undefined : target,
  });

  return (
    <nav className="mt-10 flex items-center justify-center gap-4" aria-label="Pagination">
      {hasPrev ? (
        <Link to={to} search={pageSearch(page - 1)} className={linkClass}>
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Link>
      ) : (
        <span className={disabledClass} aria-disabled="true">
          <ChevronLeft className="h-4 w-4" />
          Previous
        </span>
      )}

      <span className="text-sm text-zinc-500">
        Page {page} of {totalPages}
      </span>

      {hasNext ? (
        <Link to={to} search={pageSearch(page + 1)} className={linkClass}>
          Next
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span className={disabledClass} aria-disabled="true">
          Next
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </nav>
  );
};
