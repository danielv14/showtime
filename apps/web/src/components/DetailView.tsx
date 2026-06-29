import { Play } from "lucide-react";
import type { ExternalRating, MediaDetail } from "../server/media";
import { CastList } from "./CastList";
import { EpisodeRatings } from "./EpisodeRatings";
import { MediaRow } from "./MediaRow";
import { WhereToWatch } from "./WhereToWatch";

const ratingAccent: Record<string, string> = {
  IMDb: "text-amber-300",
  "Rotten Tomatoes": "text-red-400",
  Metacritic: "text-emerald-300",
};

const RatingChip = ({ rating }: { rating: ExternalRating }) => (
  <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5">
    <span className="block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
      {rating.source}
    </span>
    <span className={`text-sm font-bold ${ratingAccent[rating.source] ?? "text-zinc-100"}`}>
      {rating.value}
    </span>
  </div>
);

export const DetailView = ({ detail }: { detail: MediaDetail }) => {
  const facts = [
    detail.year,
    detail.runtime,
    detail.mediaType === "tv" && detail.seasons
      ? `${detail.seasons} season${detail.seasons === 1 ? "" : "s"}`
      : null,
  ].filter(Boolean);

  return (
    <div>
      <div className="relative">
        {detail.backdropUrl ? (
          <div className="absolute inset-0 h-full w-full overflow-hidden">
            <img
              src={detail.backdropUrl}
              alt=""
              className="h-full w-full object-cover object-top opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/85 to-zinc-950/40" />
          </div>
        ) : null}

        <div className="relative mx-auto flex max-w-6xl flex-col gap-6 px-4 pb-10 pt-10 sm:flex-row sm:px-6 sm:pt-14">
          <div className="mx-auto w-40 shrink-0 sm:mx-0 sm:w-56">
            <div className="aspect-[2/3] overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl shadow-black/60">
              {detail.posterUrl ? (
                <img
                  src={detail.posterUrl}
                  alt={detail.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center px-3 text-center text-sm text-zinc-600">
                  {detail.title}
                </div>
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {detail.title}
            </h1>
            {detail.tagline ? (
              <p className="mt-1 text-sm italic text-zinc-400">{detail.tagline}</p>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-400">
              {facts.map((fact, index) => (
                <span key={fact} className="flex items-center gap-3">
                  {index > 0 ? <span className="text-zinc-600">•</span> : null}
                  {fact}
                </span>
              ))}
            </div>

            {detail.genres.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {detail.genres.map((genre) => (
                  <span
                    key={genre}
                    className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-zinc-300"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            ) : null}

            {detail.ratings.length > 0 ? (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {detail.ratings.map((rating) => (
                  <RatingChip key={rating.source} rating={rating} />
                ))}
              </div>
            ) : null}

            {detail.overview ? (
              <p className="mt-5 max-w-2xl text-sm leading-relaxed text-zinc-300">
                {detail.overview}
              </p>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-4 text-sm text-zinc-400">
              {detail.directors.length > 0 ? (
                <p>
                  <span className="text-zinc-500">
                    {detail.mediaType === "tv" ? "Created by" : "Director"}:{" "}
                  </span>
                  <span className="text-zinc-200">{detail.directors.join(", ")}</span>
                </p>
              ) : null}
              {detail.writers.length > 0 ? (
                <p>
                  <span className="text-zinc-500">Writers: </span>
                  <span className="text-zinc-200">{detail.writers.slice(0, 3).join(", ")}</span>
                </p>
              ) : null}
            </div>

            {detail.awards ? (
              <p className="mt-3 text-sm text-amber-200/80">🏆 {detail.awards}</p>
            ) : null}

            {detail.trailerUrl ? (
              <a
                href={detail.trailerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-amber-400 px-5 py-2.5 text-sm font-semibold text-zinc-950 no-underline transition hover:bg-amber-300"
              >
                <Play className="h-4 w-4 fill-zinc-950" />
                Watch Trailer
              </a>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-10 px-4 pb-4 sm:px-6">
        <section>
          <h2 className="mb-4 text-lg font-semibold tracking-tight text-zinc-100">
            Where to watch
          </h2>
          <WhereToWatch data={detail.whereToWatch} />
        </section>

        {detail.mediaType === "tv" && detail.imdbId ? (
          <EpisodeRatings imdbId={detail.imdbId} />
        ) : null}

        {detail.cast.length > 0 ? (
          <section>
            <h2 className="mb-4 text-lg font-semibold tracking-tight text-zinc-100">Top cast</h2>
            <CastList cast={detail.cast} />
          </section>
        ) : null}

        <MediaRow
          title={detail.mediaType === "tv" ? "Similar series" : "Similar movies"}
          items={detail.similar}
        />
      </div>
    </div>
  );
};
