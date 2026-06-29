import { createFileRoute } from "@tanstack/react-router";
import {
  searchMulti,
  type MediaItem,
  type PersonItem,
} from "../server/media";
import { MediaGrid } from "../components/MediaGrid";
import { PersonCard } from "../components/PersonCard";
import { SearchBar } from "../components/SearchBar";

const SearchPage = () => {
  const { query, results } = Route.useLoaderData();
  const media = results.filter(
    (item): item is MediaItem => item.mediaType !== "person"
  );
  const people = results.filter(
    (item): item is PersonItem => item.mediaType === "person"
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8 max-w-xl">
        <SearchBar initialQuery={query} autoFocus />
      </div>

      {query ? (
        <p className="mb-6 text-sm text-zinc-500">
          {results.length} result{results.length === 1 ? "" : "s"} for{" "}
          <span className="text-zinc-300">“{query}”</span>
        </p>
      ) : (
        <p className="text-sm text-zinc-500">
          Search for a movie, show, or person.
        </p>
      )}

      {media.length > 0 ? <MediaGrid items={media} /> : null}

      {people.length > 0 ? (
        <section className="mt-12">
          <h2 className="mb-4 text-lg font-semibold tracking-tight text-zinc-100">
            People
          </h2>
          <div className="grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {people.map((person) => (
              <PersonCard key={person.id} person={person} />
            ))}
          </div>
        </section>
      ) : null}

      {query && results.length === 0 ? (
        <p className="text-sm text-zinc-500">No results found.</p>
      ) : null}
    </main>
  );
};

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>): { q: string } => ({
    q: typeof search.q === "string" ? search.q : "",
  }),
  loaderDeps: ({ search: { q } }) => ({ q }),
  loader: ({ deps: { q } }) => searchMulti({ data: q }),
  component: SearchPage,
});
