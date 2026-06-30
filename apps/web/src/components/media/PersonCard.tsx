import { Link } from "@tanstack/react-router";
import { User } from "lucide-react";
import type { PersonItem } from "#/server/media";
import { toPersonSlug } from "#/lib/slug";

export const PersonCard = ({ person }: { person: PersonItem }) => (
  <Link
    to="/person/$slug"
    params={{ slug: toPersonSlug(person) }}
    className="group block no-underline"
  >
    <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-white/5 bg-zinc-900 shadow-lg shadow-black/40 transition group-hover:border-white/15">
      {person.profileUrl ? (
        <img
          src={person.profileUrl}
          alt={person.name}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-zinc-700">
          <User className="h-10 w-10" />
        </div>
      )}
    </div>
    <div className="mt-2">
      <p className="truncate text-sm font-medium text-zinc-100 transition group-hover:text-white">
        {person.name}
      </p>
      <p className="truncate text-xs text-zinc-500">
        {person.knownFor.length > 0 ? person.knownFor.join(", ") : person.department}
      </p>
    </div>
  </Link>
);
