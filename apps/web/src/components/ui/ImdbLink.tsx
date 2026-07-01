import { ExternalLink } from "lucide-react";

/**
 * "View on IMDb" external-link button, shared by the detail and person pages.
 * `kind` picks the IMDb path base (`/title/` for media, `/name/` for people);
 * `id` is the IMDb id.
 */
export const ImdbLink = ({ kind, id }: { kind: "title" | "name"; id: string }) => (
  <a
    href={`https://www.imdb.com/${kind}/${id}/`}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-zinc-100 no-underline transition hover:bg-white/10"
  >
    <ExternalLink className="h-4 w-4" />
    View on IMDb
  </a>
);
