import { Layers } from "lucide-react";
import type { CollectionDetail } from "#/server/media";
import { MediaGrid } from "#/components/media/MediaGrid";

export const CollectionView = ({ collection }: { collection: CollectionDetail }) => (
  <div>
    <div className="relative">
      {collection.backdropUrl ? (
        <div className="absolute inset-0 h-full w-full overflow-hidden">
          <img
            src={collection.backdropUrl}
            alt=""
            className="h-full w-full object-cover object-top opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/85 to-zinc-950/40" />
        </div>
      ) : null}

      <div className="relative mx-auto flex max-w-6xl flex-col gap-6 px-4 pb-10 pt-10 sm:flex-row sm:px-6 sm:pt-14">
        <div className="mx-auto w-40 shrink-0 sm:mx-0 sm:w-56">
          <div className="aspect-[2/3] overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl shadow-black/60">
            {collection.posterUrl ? (
              <img
                src={collection.posterUrl}
                alt={collection.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-zinc-700">
                <Layers className="h-12 w-12" />
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">Collection</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {collection.name}
          </h1>
          <p className="mt-3 text-sm text-zinc-400">
            {collection.parts.length} {collection.parts.length === 1 ? "movie" : "movies"}
          </p>
          {collection.overview ? (
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-zinc-300">
              {collection.overview}
            </p>
          ) : null}
        </div>
      </div>
    </div>

    <div className="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
      {collection.parts.length > 0 ? (
        <MediaGrid items={collection.parts} />
      ) : (
        <p className="py-16 text-center text-sm text-zinc-500">
          No movies found in this collection.
        </p>
      )}
    </div>
  </div>
);
