import { Link, useRouter, type ErrorComponentProps } from "@tanstack/react-router";

/**
 * Route-level error boundary view. TanStack Router renders this in place of a
 * route's content whenever its loader or component throws, keeping the shell
 * (Header/Footer) intact. Wired as the router's `defaultErrorComponent` so
 * every route is isolated: a failure on a detail page can't take down the app.
 */
export const ErrorView = ({ error, reset }: ErrorComponentProps) => {
  const router = useRouter();

  // Re-run the failed route's loader and clear the boundary. `reset` resets the
  // boundary state; `invalidate` re-fetches so a transient upstream (TMDB/OMDB)
  // failure can recover without a full page reload.
  const retry = () => {
    reset();
    void router.invalidate();
  };

  return (
    <main className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
        Something went wrong
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
        We hit a snag
      </h1>
      <p className="mt-3 max-w-md text-sm text-zinc-400">
        This page failed to load. It may be a temporary problem fetching data — try again, or head
        back home.
      </p>

      {import.meta.env.DEV && error?.message ? (
        <pre className="mt-6 max-w-full overflow-x-auto rounded-lg border border-white/10 bg-zinc-900/80 px-4 py-3 text-left text-xs text-rose-300">
          {error.message}
        </pre>
      ) : null}

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={retry}
          className="rounded-full bg-amber-400 px-5 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-amber-300"
        >
          Try again
        </button>
        <Link
          to="/"
          className="rounded-full border border-white/10 px-5 py-2 text-sm font-semibold text-zinc-200 transition hover:bg-white/5"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
};
