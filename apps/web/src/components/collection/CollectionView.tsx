import { Layers } from "lucide-react";
import type { CollectionDetail } from "#/server/media";
import { MediaGrid } from "#/components/media/MediaGrid";
import { MediaHero } from "#/components/media/MediaHero";
import { PosterFrame } from "#/components/media/PosterFrame";

export const CollectionView = ({ collection }: { collection: CollectionDetail }) => (
  <div>
    <MediaHero
      backdropUrl={collection.backdropUrl}
      poster={
        <PosterFrame
          src={collection.posterUrl}
          alt={collection.name}
          fallback={
            <div className="flex h-full w-full items-center justify-center text-zinc-700">
              <Layers className="h-12 w-12" />
            </div>
          }
        />
      }
    >
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
    </MediaHero>

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
