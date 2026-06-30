import { createFileRoute } from "@tanstack/react-router";
import { browseTv, getTvGenres } from "../server/media";
import {
  BROWSE_YEAR_FLOOR,
  normalizeBrowseFilters,
  toBrowseSearch,
  type BrowseSearch,
} from "../server/browse";
import { BrowseView } from "#/components/browse/BrowseView";
import { currentYearRange } from "../lib/year-options";
import { browseMeta } from "../lib/seo";

const ShowsPage = () => {
  const { items, page, totalPages, filters, genres, yearRange } = Route.useLoaderData();
  return (
    <BrowseView
      to="/shows"
      heading="TV Shows"
      items={items}
      page={page}
      totalPages={totalPages}
      filters={filters}
      genres={genres}
      yearRange={yearRange}
    />
  );
};

export const Route = createFileRoute("/shows")({
  validateSearch: (search: Record<string, unknown>): BrowseSearch =>
    toBrowseSearch(normalizeBrowseFilters(search)),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const filters = normalizeBrowseFilters(deps);
    const [result, genres] = await Promise.all([browseTv({ data: filters }), getTvGenres()]);
    return {
      ...result,
      filters,
      genres,
      yearRange: currentYearRange(BROWSE_YEAR_FLOOR),
    };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [] };
    const genreName = loaderData.genres.find((g) => g.id === loaderData.filters.genre)?.name;
    return { meta: browseMeta({ mediaNoun: "TV Shows", filters: loaderData.filters, genreName }) };
  },
  component: ShowsPage,
});
