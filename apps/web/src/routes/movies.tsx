import { createFileRoute } from "@tanstack/react-router";
import { browseMovies, getMovieGenres } from "../server/media";
import { normalizeBrowseFilters, toBrowseSearch, type BrowseSearch } from "../server/browse";
import { BrowseView } from "../components/BrowseView";
import { browseMeta } from "../lib/seo";

const EARLIEST_YEAR = 1950;

const MoviesPage = () => {
  const { items, page, totalPages, filters, genres, yearRange } = Route.useLoaderData();
  return (
    <BrowseView
      to="/movies"
      heading="Movies"
      items={items}
      page={page}
      totalPages={totalPages}
      filters={filters}
      genres={genres}
      yearRange={yearRange}
    />
  );
};

export const Route = createFileRoute("/movies")({
  validateSearch: (search: Record<string, unknown>): BrowseSearch =>
    toBrowseSearch(normalizeBrowseFilters(search)),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const filters = normalizeBrowseFilters(deps);
    const [result, genres] = await Promise.all([browseMovies({ data: filters }), getMovieGenres()]);
    const currentYear = new Date().getFullYear();
    return {
      ...result,
      filters,
      genres,
      yearRange: { min: EARLIEST_YEAR, max: currentYear + 1 },
    };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [] };
    const genreName = loaderData.genres.find((g) => g.id === loaderData.filters.genre)?.name;
    return { meta: browseMeta({ mediaNoun: "Movies", filters: loaderData.filters, genreName }) };
  },
  component: MoviesPage,
});
