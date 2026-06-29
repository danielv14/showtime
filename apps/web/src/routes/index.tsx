import { createFileRoute, Link } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { getHomeData } from "../server/media";
import { MediaRow } from "../components/MediaRow";
import { toMediaSlug } from "../lib/slug";

const Home = () => {
  const { trending, upcoming } = Route.useLoaderData();
  const hero = trending.find((item) => item.backdropUrl) ?? trending[0];

  return (
    <main>
      {hero ? (
        <section className="relative">
          <div className="absolute inset-0 overflow-hidden">
            {hero.backdropUrl ? (
              <img
                src={hero.backdropUrl}
                alt=""
                className="h-full w-full object-cover object-top opacity-30"
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent" />
          </div>
          <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-16 sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
              Trending now
            </p>
            <h1 className="mt-2 max-w-2xl text-4xl font-bold tracking-tight text-white sm:text-5xl">
              {hero.title}
            </h1>
            <div className="mt-3 flex items-center gap-3 text-sm text-zinc-400">
              {hero.rating > 0 ? (
                <span className="inline-flex items-center gap-1 text-amber-300">
                  <Star className="h-4 w-4 fill-amber-300" />
                  {hero.rating.toFixed(1)}
                </span>
              ) : null}
              <span>{hero.year}</span>
              <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs uppercase tracking-wide text-zinc-300">
                {hero.mediaType}
              </span>
            </div>
            {hero.overview ? (
              <p className="mt-4 line-clamp-3 max-w-xl text-sm leading-relaxed text-zinc-300">
                {hero.overview}
              </p>
            ) : null}
            <Link
              to={hero.mediaType === "movie" ? "/movie/$slug" : "/tv/$slug"}
              params={{ slug: toMediaSlug(hero) }}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-amber-400 px-5 py-2.5 text-sm font-semibold text-zinc-950 no-underline transition hover:bg-amber-300"
            >
              View details
            </Link>
          </div>
        </section>
      ) : null}

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <MediaRow title="Trending this week" items={trending} />
        <MediaRow title="Coming soon" items={upcoming} />
      </div>
    </main>
  );
};

export const Route = createFileRoute("/")({
  component: Home,
  loader: () => getHomeData(),
  head: () => ({
    meta: [
      { title: "Showtime — Trending movies & TV" },
      {
        name: "description",
        content:
          "Browse what's trending, search movies, shows and people, and find where to stream.",
      },
    ],
  }),
});
