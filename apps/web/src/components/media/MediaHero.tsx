import type { ReactNode } from "react";

/**
 * The hero shell shared by the movie/TV detail and collection pages: a dimmed,
 * gradient-masked backdrop behind a poster-and-content row. The `poster` slot
 * takes a `PosterFrame`; `children` is the title/metadata column beside it.
 * Renders the backdrop only when a `backdropUrl` is given.
 */
export const MediaHero = ({
  backdropUrl,
  poster,
  children,
}: {
  backdropUrl: string | null;
  poster: ReactNode;
  children: ReactNode;
}) => (
  <div className="relative">
    {backdropUrl ? (
      <div className="absolute inset-0 h-full w-full overflow-hidden">
        <img
          src={backdropUrl}
          alt=""
          className="h-full w-full object-cover object-top opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/85 to-zinc-950/40" />
      </div>
    ) : null}

    <div className="relative mx-auto flex max-w-6xl flex-col gap-6 px-4 pb-10 pt-10 sm:flex-row sm:px-6 sm:pt-14">
      {poster}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  </div>
);
