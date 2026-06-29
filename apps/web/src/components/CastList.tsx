import { User } from "lucide-react";
import type { CastMember } from "../server/media";

export const CastList = ({ cast }: { cast: CastMember[] }) => {
  if (cast.length === 0) return null;
  return (
    <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7">
      {cast.map((member) => (
        <div key={member.id} className="text-center">
          <div className="mx-auto mb-2 aspect-square w-full overflow-hidden rounded-full border border-white/10 bg-zinc-900">
            {member.profileUrl ? (
              <img
                src={member.profileUrl}
                alt={member.name}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-zinc-700">
                <User className="h-7 w-7" />
              </div>
            )}
          </div>
          <p className="truncate text-xs font-medium text-zinc-200">
            {member.name}
          </p>
          <p className="truncate text-xs text-zinc-500">{member.character}</p>
        </div>
      ))}
    </div>
  );
};
