import type { FilmographySection, PersonCredit } from "#/server/media";
import { MediaCard } from "#/components/media/MediaCard";

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

/** A person's filmography: one titled grid of credits per department. */
export const Filmography = ({ sections }: { sections: FilmographySection[] }) => (
  <div className="mt-12 space-y-12">
    {sections.map((section) => (
      <FilmographyGroup key={section.department} section={section} />
    ))}
  </div>
);
