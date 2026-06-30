import type { SearchFilters as SearchFiltersState } from "../server/search";
import type { MediaItem, PersonItem, SearchItem } from "../server/media";
import { MediaGrid } from "./MediaGrid";
import { Pagination } from "./Pagination";
import { PersonCard } from "./PersonCard";
import { SearchBar } from "./SearchBar";
import { SearchFilters } from "./SearchFilters";

/**
 * The search page layout: the search box, the type/year filter controls, and the
 * results split into a media grid and a people section. Receives already-shaped,
 * already-paginated data; all filtering and dispatch happens in the server layer.
 *
 * When the type narrows to a single kind only the matching section has any
 * results, so only it renders. An empty query shows a prompt instead of running
 * a search; a query that matches nothing shows an empty state.
 */
export const SearchView = ({
  query,
  results,
  page,
  totalPages,
  filters,
  yearRange,
}: {
  query: string;
  results: SearchItem[];
  page: number;
  totalPages: number;
  filters: SearchFiltersState;
  yearRange: { min: number; max: number };
}) => {
  const media = results.filter((item): item is MediaItem => item.mediaType !== "person");
  const people = results.filter((item): item is PersonItem => item.mediaType === "person");

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8 max-w-xl">
        <SearchBar initialQuery={query} autoFocus />
      </div>

      {query ? (
        <>
          <div className="mb-6">
            <SearchFilters filters={filters} yearRange={yearRange} />
          </div>

          <p className="mb-6 text-sm text-zinc-500">
            {results.length} result{results.length === 1 ? "" : "s"} for{" "}
            <span className="text-zinc-300">“{query}”</span>
            {totalPages > 1 ? ` · page ${page} of ${totalPages}` : ""}
          </p>

          {media.length > 0 ? <MediaGrid items={media} /> : null}

          {people.length > 0 ? (
            <section className={media.length > 0 ? "mt-12" : ""}>
              <h2 className="mb-4 text-lg font-semibold tracking-tight text-zinc-100">People</h2>
              <div className="grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                {people.map((person) => (
                  <PersonCard key={person.id} person={person} />
                ))}
              </div>
            </section>
          ) : null}

          {results.length === 0 ? (
            <p className="py-16 text-center text-sm text-zinc-500">
              No results match your search. Try a different query or filter.
            </p>
          ) : (
            <Pagination to="/search" page={page} totalPages={totalPages} />
          )}
        </>
      ) : (
        <p className="text-sm text-zinc-500">Search for a movie, show, or person.</p>
      )}
    </main>
  );
};
