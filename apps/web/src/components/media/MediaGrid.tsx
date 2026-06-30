import type { MediaItem } from "#/server/media";
import { MediaCard } from "./MediaCard";

export const MediaGrid = ({ items }: { items: MediaItem[] }) => (
  <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
    {items.map((item) => (
      <MediaCard key={`${item.mediaType}-${item.id}`} item={item} />
    ))}
  </div>
);
