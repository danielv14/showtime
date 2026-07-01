import { createFileRoute } from "@tanstack/react-router";
import { searchMedia } from "#/server/media";
import {
  normalizeSearchFilters,
  SEARCH_YEAR_FLOOR,
  toSearchSearch,
  type SearchSearch,
} from "#/server/search";
import { SearchView } from "#/components/search/SearchView";
import { currentYearRange } from "#/lib/year-options";
import { searchMeta } from "#/lib/seo";

const SearchPage = () => {
  const { query, results, page, totalPages, filters, yearRange } = Route.useLoaderData();
  return (
    <SearchView
      query={query}
      results={results}
      page={page}
      totalPages={totalPages}
      filters={filters}
      yearRange={yearRange}
    />
  );
};

export const Route = createFileRoute("/search")({
  // Normalise then strip defaults so a plain search stays at `/search?q=...` and
  // a hand-edited URL (bad type/year/page) resolves to a sane view rather than
  // throwing. The loader re-normalises the same params back into full filters.
  validateSearch: (search: Record<string, unknown>): SearchSearch =>
    toSearchSearch(normalizeSearchFilters(search)),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const filters = normalizeSearchFilters(deps);
    const result = await searchMedia({ data: filters });
    return { ...result, filters, yearRange: currentYearRange(SEARCH_YEAR_FLOOR) };
  },
  head: ({ loaderData }) =>
    loaderData ? { meta: searchMeta(loaderData.query, loaderData.filters.type) } : { meta: [] },
  component: SearchPage,
});
