import {
  BROWSE_SORTS,
  type BrowseFilters as BrowseFiltersState,
  type BrowseSort,
  type GenreOption,
} from "../server/browse";

const SORT_LABELS: Record<BrowseSort, string> = {
  popularity: "Most popular",
  newest: "Newest",
  rating: "Highest rated",
};

const RATING_OPTIONS = [9, 8, 7, 6, 5] as const;

/**
 * Filter controls for a browse view, built as a native GET form so filtering
 * works without client JS (mirroring `SearchBar`). The form's `action` is the
 * browse route path and each control's `name` is the matching URL search param,
 * so a submit produces a shareable, bookmarkable URL. With JS, changing any
 * control auto-submits for an instant feel; the "Apply" button covers no-JS.
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
  yearRange: { min: number; max: number };
}) => {
  const years: number[] = [];
  for (let year = yearRange.max; year >= yearRange.min; year--) years.push(year);

  // Auto-submit on change when JS is available; harmless no-op without it.
  const submit = (event: { currentTarget: { form: HTMLFormElement | null } }) =>
    event.currentTarget.form?.requestSubmit();

  const selectClass =
    "rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-white/25 focus:bg-white/10";

  return (
    <form
      action={action}
      method="get"
      className="flex flex-wrap items-end gap-3"
      aria-label="Filter results"
    >
      <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
        Genre
        <select
          name="genre"
          defaultValue={filters.genre ?? ""}
          onChange={submit}
          className={selectClass}
        >
          <option value="">All genres</option>
          {genres.map((genre) => (
            <option key={genre.id} value={genre.id}>
              {genre.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
        Min rating
        <select
          name="rating"
          defaultValue={filters.minRating ?? ""}
          onChange={submit}
          className={selectClass}
        >
          <option value="">Any rating</option>
          {RATING_OPTIONS.map((rating) => (
            <option key={rating} value={rating}>
              {rating}+
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
        Year
        <select
          name="year"
          defaultValue={filters.year ?? ""}
          onChange={submit}
          className={selectClass}
        >
          <option value="">Any year</option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
        Sort by
        <select name="sort" defaultValue={filters.sort} onChange={submit} className={selectClass}>
          {BROWSE_SORTS.map((sort) => (
            <option key={sort} value={sort}>
              {SORT_LABELS[sort]}
            </option>
          ))}
        </select>
      </label>

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
