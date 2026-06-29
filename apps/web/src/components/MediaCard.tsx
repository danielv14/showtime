import { Link } from "@tanstack/react-router";
import { Star } from "lucide-react";
import type { MediaItem } from "../server/media";
import { toMediaSlug } from "../lib/slug";

export const MediaCard = ({ item }: { item: MediaItem }) => {
  const to = item.mediaType === "movie" ? "/movie/$slug" : "/tv/$slug";
  return (
    <Link to={to} params={{ slug: toMediaSlug(item) }} className="group block">
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl border border-white/5 bg-zinc-900 shadow-lg shadow-black/40 transition duration-200 group-hover:border-white/15">
        {item.posterUrl ? (
          <img
            src={item.posterUrl}
            alt={item.title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-3 text-center text-xs text-zinc-600">
            {item.title}
          </div>
        )}

        {item.rating > 0 && (
          <span className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-xs font-semibold text-amber-300 backdrop-blur-md">
            <Star className="h-3 w-3 fill-amber-300" />
            {item.rating.toFixed(1)}
          </span>
        )}
        <span className="absolute right-2 top-2 z-10 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/90 backdrop-blur-md">
          {item.mediaType}
        </span>
      </div>
      <div className="mt-2">
        <p className="truncate text-sm font-medium text-zinc-100 transition group-hover:text-white">
          {item.title}
        </p>
        <p className="text-xs text-zinc-500">{item.year}</p>
      </div>
    </Link>
  );
};
