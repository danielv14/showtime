import type { BrowseFilters as BrowseFiltersState, GenreOption } from "#/server/browse";
import type { MediaItem } from "#/server/media";
import { MediaGrid } from "#/components/media/MediaGrid";
import { EmptyState } from "#/components/ui/EmptyState";
import { Pagination } from "#/components/ui/Pagination";
import { BrowseFilters } from "./BrowseFilters";

type BrowsePath = "/movies" | "/shows";

/**
 * Shared layout for the movie and TV browse surfaces. Both routes render this
 * with their own path, heading, and already-shaped data; the only differences
 * between movies and TV are the route path, the genre list, and the year span,
 * all passed in.
 */
export const BrowseView = ({
  to,
  heading,
  items,
  page,
  totalPages,
  filters,
  genres,
  yearRange,
}: {
  to: BrowsePath;
  heading: string;
  items: MediaItem[];
  page: number;
  totalPages: number;
  filters: BrowseFiltersState;
  genres: GenreOption[];
  yearRange: { min: number; max: number };
}) => (
  <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
    <h1 className="mb-6 text-2xl font-bold tracking-tight text-zinc-100">{heading}</h1>

    <div className="mb-8">
      <BrowseFilters action={to} genres={genres} filters={filters} yearRange={yearRange} />
    </div>

    {items.length > 0 ? (
      <>
        <MediaGrid items={items} />
        <Pagination to={to} page={page} totalPages={totalPages} />
      </>
    ) : (
      <EmptyState>No titles match these filters. Try widening your selection.</EmptyState>
    )}
  </main>
);
