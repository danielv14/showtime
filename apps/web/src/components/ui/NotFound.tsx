import { Link } from "@tanstack/react-router";

/** Clean 404 view for unmatched routes and invalid media slugs. */
export const NotFound = () => (
  <main className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 text-center sm:px-6">
    <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">404</p>
    <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
      Page not found
    </h1>
    <p className="mt-3 max-w-md text-sm text-zinc-400">
      We could not find what you were looking for. The link may be broken or the title may no longer
      exist.
    </p>
    <Link
      to="/"
      className="mt-6 rounded-full bg-amber-400 px-5 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-amber-300"
    >
      Back to home
    </Link>
  </main>
);
