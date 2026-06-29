import type { MediaItem } from "../server/media";
import { MediaCard } from "./MediaCard";

interface MediaRowProps {
  title: string;
  items: MediaItem[];
}

export const MediaRow = ({ title, items }: MediaRowProps) => {
  if (items.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="mb-4 text-lg font-semibold tracking-tight text-zinc-100">
        {title}
      </h2>
      <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:thin] sm:-mx-6 sm:px-6">
        {items.map((item) => (
          <div key={`${item.mediaType}-${item.id}`} className="w-[140px] sm:w-[160px]">
            <MediaCard item={item} />
          </div>
        ))}
      </div>
    </section>
  );
};
