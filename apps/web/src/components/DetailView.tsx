import { NA } from "@showtime/core";
import { Link } from "@tanstack/react-router";
import { ExternalLink, Play } from "lucide-react";
import type { CreditName, EpisodeRatingsData, ExternalRating, MediaDetail } from "../server/media";
import { toPersonSlug } from "../lib/slug";
import { CastList } from "./CastList";
import { EpisodeRatings } from "./EpisodeRatings";
import { MediaRow } from "./MediaRow";
import { Reviews } from "./Reviews";
import { WhereToWatch } from "./WhereToWatch";

const ratingAccent: Record<string, string> = {
  IMDb: "text-amber-300",
  "Rotten Tomatoes": "text-red-400",
  Metacritic: "text-emerald-300",
};

/** Render a list of credited people as person-page links, comma-separated. */
const PeopleLinks = ({ people }: { people: CreditName[] }) => (
  <span className="text-zinc-200">
    {people.map((person, index) => (
      <span key={person.id}>
        {index > 0 ? ", " : null}
        <Link
          to="/person/$slug"
          params={{ slug: toPersonSlug(person) }}
          className="text-zinc-200 underline-offset-2 transition hover:text-white hover:underline"
        >
          {person.name}
        </Link>
      </span>
    ))}
  </span>
);

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

export const DetailView = ({
  detail,
  ratings,
}: {
  detail: MediaDetail;
  ratings?: Promise<EpisodeRatingsData | null> | null;
}) => {
  const facts = [detail.year, detail.runtime, detail.seasonsLabel].filter(
    (fact) => Boolean(fact) && fact !== NA,
  );

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
                  <Link
                    key={genre.id}
                    to={detail.mediaType === "movie" ? "/movies" : "/shows"}
                    search={{ genre: genre.id }}
                    className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-zinc-300 no-underline transition hover:border-white/25 hover:text-white"
                  >
                    {genre.name}
                  </Link>
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
                  <PeopleLinks people={detail.directors} />
                </p>
              ) : null}
              {detail.writers.length > 0 ? (
                <p>
                  <span className="text-zinc-500">Writers: </span>
                  <PeopleLinks people={detail.writers.slice(0, 3)} />
                </p>
              ) : null}
            </div>

            {detail.awards ? (
              <p className="mt-3 text-sm text-amber-200/80">🏆 {detail.awards}</p>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {detail.trailerUrl ? (
                <a
                  href={detail.trailerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-5 py-2.5 text-sm font-semibold text-zinc-950 no-underline transition hover:bg-amber-300"
                >
                  <Play className="h-4 w-4 fill-zinc-950" />
                  Watch Trailer
                </a>
              ) : null}
              {detail.imdbId ? (
                <a
                  href={`https://www.imdb.com/title/${detail.imdbId}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-zinc-100 no-underline transition hover:bg-white/10"
                >
                  <ExternalLink className="h-4 w-4" />
                  View on IMDb
                </a>
              ) : null}
            </div>
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

        {detail.mediaType === "tv" && ratings ? <EpisodeRatings ratings={ratings} /> : null}

        {detail.cast.length > 0 ? (
          <section>
            <h2 className="mb-4 text-lg font-semibold tracking-tight text-zinc-100">Top cast</h2>
            <CastList cast={detail.cast} />
          </section>
        ) : null}

        <Reviews reviews={detail.reviews} />

        <MediaRow
          title={detail.mediaType === "tv" ? "Similar series" : "Similar movies"}
          items={detail.similar}
        />
      </div>
    </div>
  );
};
