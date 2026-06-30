import { Search } from "lucide-react";

/**
 * A native GET form pointing at `/search`. Using a real form (rather than a
 * router hook) keeps the search box usable from the root shell/header, works
 * during SSR, and degrades gracefully without client JS. The `/search` route
 * reads the `q` query param.
 */
export const SearchBar = ({
  initialQuery = "",
  autoFocus = false,
}: {
  initialQuery?: string;
  autoFocus?: boolean;
}) => (
  <form action="/search" method="get" role="search" className="relative w-full">
    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
    <input
      type="search"
      name="q"
      defaultValue={initialQuery}
      autoFocus={autoFocus}
      placeholder="Search movies, shows, people…"
      aria-label="Search"
      className="w-full rounded-full border border-white/10 bg-white/5 py-2 pl-10 pr-4 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-white/25 focus:bg-white/10"
    />
  </form>
);
