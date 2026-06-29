import type { SearchFilters as SearchFiltersState, SearchType } from "../server/search";

const TYPE_LABELS: Record<SearchType, string> = {
  all: "All",
  movie: "Movies",
  tv: "TV Shows",
  person: "People",
};

/**
 * Type + year controls for the search page, built as a native GET form pointing
 * at `/search` (mirroring `SearchBar`) so filtering works without client JS. The
 * current query rides along as a hidden field so a filter submit keeps it; with
 * JS, changing a control auto-submits for an instant feel, and the "Apply" button
 * covers the no-JS case.
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
  const years: number[] = [];
  for (let year = yearRange.max; year >= yearRange.min; year--) years.push(year);

  // Auto-submit on change when JS is available; harmless no-op without it.
  const submit = (event: { currentTarget: { form: HTMLFormElement | null } }) =>
    event.currentTarget.form?.requestSubmit();

  const selectClass =
    "rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-white/25 focus:bg-white/10";

  return (
    <form
      action="/search"
      method="get"
      className="flex flex-wrap items-end gap-3"
      aria-label="Filter search results"
    >
      <input type="hidden" name="q" value={filters.query} readOnly />

      <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
        Type
        <select name="type" defaultValue={filters.type} onChange={submit} className={selectClass}>
          {(Object.keys(TYPE_LABELS) as SearchType[]).map((type) => (
            <option key={type} value={type}>
              {TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </label>

      {showYear ? (
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
