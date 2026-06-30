import type { ReactNode } from "react";

/**
 * The 2:3 poster card shared by the detail, collection, and person heroes: a
 * rounded, bordered frame showing the poster image, or a caller-supplied
 * `fallback` (a title or an icon) when there is no image.
 */
export const PosterFrame = ({
  src,
  alt,
  fallback,
}: {
  src: string | null;
  alt: string;
  fallback: ReactNode;
}) => (
  <div className="mx-auto w-40 shrink-0 sm:mx-0 sm:w-56">
    <div className="aspect-[2/3] overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl shadow-black/60">
      {src ? <img src={src} alt={alt} className="h-full w-full object-cover" /> : fallback}
    </div>
  </div>
);
