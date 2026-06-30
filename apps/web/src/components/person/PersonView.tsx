import { Cake, ExternalLink, MapPin, User } from "lucide-react";
import type { PersonDetail } from "#/server/media";
import { lifespan } from "#/lib/date";
import { MediaRow } from "#/components/media/MediaRow";
import { Filmography } from "./Filmography";

export const PersonView = ({ person }: { person: PersonDetail }) => {
  const dates = lifespan(person.birthday, person.deathday);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
        <div className="mx-auto w-40 shrink-0 sm:mx-0 sm:w-56">
          <div className="aspect-[2/3] overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl shadow-black/60">
            {person.profileUrl ? (
              <img
                src={person.profileUrl}
                alt={person.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-zinc-700">
                <User className="h-12 w-12" />
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {person.name}
          </h1>
          {person.knownForDepartment ? (
            <p className="mt-1 text-sm text-zinc-400">{person.knownForDepartment}</p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-400">
            {dates ? (
              <span className="flex items-center gap-1.5">
                <Cake className="h-4 w-4 text-zinc-500" />
                {dates}
              </span>
            ) : null}
            {person.placeOfBirth ? (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-zinc-500" />
                {person.placeOfBirth}
              </span>
            ) : null}
          </div>

          {person.biography ? (
            <p className="mt-5 max-w-2xl whitespace-pre-line text-sm leading-relaxed text-zinc-300">
              {person.biography}
            </p>
          ) : null}

          {person.imdbId ? (
            <div className="mt-6">
              <a
                href={`https://www.imdb.com/name/${person.imdbId}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-zinc-100 no-underline transition hover:bg-white/10"
              >
                <ExternalLink className="h-4 w-4" />
                View on IMDb
              </a>
            </div>
          ) : null}
        </div>
      </div>

      {person.knownFor.length > 0 ? <MediaRow title="Known for" items={person.knownFor} /> : null}

      <Filmography sections={person.filmography} />
    </div>
  );
};
