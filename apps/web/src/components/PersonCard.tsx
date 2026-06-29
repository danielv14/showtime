import { User } from "lucide-react";
import type { PersonItem } from "../server/media";

export const PersonCard = ({ person }: { person: PersonItem }) => (
  <div className="group block">
    <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-white/5 bg-zinc-900 shadow-lg shadow-black/40">
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
      <p className="truncate text-sm font-medium text-zinc-100">{person.name}</p>
      <p className="truncate text-xs text-zinc-500">
        {person.knownFor.length > 0 ? person.knownFor.join(", ") : person.department}
      </p>
    </div>
  </div>
);
