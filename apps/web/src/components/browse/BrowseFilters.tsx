import {
  BROWSE_SORTS,
  type BrowseFilters as BrowseFiltersState,
  type BrowseSort,
  type GenreOption,
} from "#/server/browse";
import { buildYearOptions, type YearRange } from "#/lib/year-options";
import { Select, type SelectOption } from "#/components/ui/Select";

const SORT_LABELS: Record<BrowseSort, string> = {
  popularity: "Most popular",
  newest: "Newest",
  rating: "Highest rated",
};

const RATING_OPTIONS = [9, 8, 7, 6, 5] as const;

/**
 * Filter controls for a browse view, built as a native GET form so the result is
 * a shareable, bookmarkable URL (mirroring `SearchBar`). The form's `action` is
 * the browse route path and each control's `name` is the matching URL search
 * param, so a submit navigates to the filtered URL. Each `Select` auto-submits
 * on change for an instant feel; the "Apply" button covers users without JS.
 *
 * `page` is intentionally not a field here: changing a filter should drop the
 * viewer back to page 1 rather than a now-meaningless deep page.
 */
export const BrowseFilters = ({
  action,
  genres,
  filters,
  yearRange,
}: {
  action: string;
  genres: GenreOption[];
  filters: BrowseFiltersState;
  yearRange: YearRange;
}) => {
  const genreOptions: SelectOption[] = [
    { value: "", label: "All genres" },
    ...genres.map((genre) => ({ value: String(genre.id), label: genre.name })),
  ];

  const ratingOptions: SelectOption[] = [
    { value: "", label: "Any rating" },
    ...RATING_OPTIONS.map((rating) => ({ value: String(rating), label: `${rating}+` })),
  ];

  const yearOptions: SelectOption[] = buildYearOptions(yearRange);

  const sortOptions: SelectOption[] = BROWSE_SORTS.map((sort) => ({
    value: sort,
    label: SORT_LABELS[sort],
  }));

  return (
    <form
      action={action}
      method="get"
      className="flex flex-wrap items-end gap-3"
      aria-label="Filter results"
    >
      <Select
        name="genre"
        label="Genre"
        options={genreOptions}
        defaultValue={filters.genre != null ? String(filters.genre) : ""}
        submitOnChange
      />

      <Select
        name="rating"
        label="Min rating"
        options={ratingOptions}
        defaultValue={filters.minRating != null ? String(filters.minRating) : ""}
        submitOnChange
      />

      <Select
        name="year"
        label="Year"
        options={yearOptions}
        defaultValue={filters.year != null ? String(filters.year) : ""}
        submitOnChange
      />

      <Select
        name="sort"
        label="Sort by"
        options={sortOptions}
        defaultValue={filters.sort}
        submitOnChange
      />

      <button
        type="submit"
        className="rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-white/15"
      >
        Apply
      </button>

      <a
        href={action}
        className="rounded-lg px-3 py-2 text-sm text-zinc-400 no-underline transition hover:text-zinc-200"
      >
        Clear
      </a>
    </form>
  );
};
