import { Cake, ExternalLink, MapPin, User } from "lucide-react";
import type { FilmographySection, PersonCredit, PersonDetail } from "../server/media";
import { MediaCard } from "./MediaCard";
import { MediaRow } from "./MediaRow";

/** Format a TMDB `YYYY-MM-DD` date as a readable string, or null if unparseable. */
const formatDate = (value: string | null): string | null => {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
};

/** "Born … — Died …" / "Born …", or null when no dates are known. */
const lifespan = (birthday: string | null, deathday: string | null): string | null => {
  const born = formatDate(birthday);
  const died = formatDate(deathday);
  if (born && died) return `${born} — ${died}`;
  if (born) return born;
  if (died) return `Died ${died}`;
  return null;
};

const CreditCard = ({ credit }: { credit: PersonCredit }) => (
  <div>
    <MediaCard item={credit} />
    {credit.role ? <p className="mt-1 truncate text-xs text-zinc-500">{credit.role}</p> : null}
  </div>
);

const FilmographyGroup = ({ section }: { section: FilmographySection }) => (
  <section>
    <h2 className="mb-4 flex items-baseline gap-2 text-lg font-semibold tracking-tight text-zinc-100">
      {section.department}
      <span className="text-sm font-normal text-zinc-500">{section.count}</span>
    </h2>
    <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {section.credits.map((credit) => (
        <CreditCard key={`${credit.mediaType}-${credit.id}`} credit={credit} />
      ))}
    </div>
  </section>
);

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

      <div className="mt-12 space-y-12">
        {person.filmography.map((section) => (
          <FilmographyGroup key={section.department} section={section} />
        ))}
      </div>
    </div>
  );
};
