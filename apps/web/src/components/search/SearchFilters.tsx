import type { SearchFilters as SearchFiltersState, SearchType } from "#/server/search";
import { buildYearOptions } from "#/lib/year-options";
import { Select, type SelectOption } from "#/components/ui/Select";

const TYPE_LABELS: Record<SearchType, string> = {
  all: "All",
  movie: "Movies",
  tv: "TV Shows",
  person: "People",
};

/**
 * Type + year controls for the search page, built as a native GET form pointing
 * at `/search` (mirroring `SearchBar`). The current query rides along as a hidden
 * field so a filter submit keeps it; each `Select` auto-submits on change for an
 * instant feel, and the "Apply" button covers users without JS.
 *
 * The year control only renders for the movie and TV types — the blended "all"
 * search and the people search take no year. `page` is intentionally not a field:
 * changing a filter drops the viewer back to page 1 rather than a now-meaningless
 * deep page.
 */
export const SearchFilters = ({
  filters,
  yearRange,
}: {
  filters: SearchFiltersState;
  yearRange: { min: number; max: number };
}) => {
  const showYear = filters.type === "movie" || filters.type === "tv";

  const typeOptions: SelectOption[] = (Object.keys(TYPE_LABELS) as SearchType[]).map((type) => ({
    value: type,
    label: TYPE_LABELS[type],
  }));

  const yearOptions: SelectOption[] = buildYearOptions(yearRange);

  return (
    <form
      action="/search"
      method="get"
      className="flex flex-wrap items-end gap-3"
      aria-label="Filter search results"
    >
      <input type="hidden" name="q" value={filters.query} readOnly />

      <Select
        name="type"
        label="Type"
        options={typeOptions}
        defaultValue={filters.type}
        submitOnChange
      />

      {showYear ? (
        <Select
          name="year"
          label="Year"
          options={yearOptions}
          defaultValue={filters.year != null ? String(filters.year) : ""}
          submitOnChange
        />
      ) : null}

      <button
        type="submit"
        className="rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-white/15"
      >
        Apply
      </button>
    </form>
  );
};
