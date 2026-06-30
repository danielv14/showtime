import { useRef, useState } from "react";
import { ExternalLink, Play } from "lucide-react";
import { youtubeVideoId } from "#/lib/youtube";
import { TrailerModal } from "./TrailerModal";

const ExternalTrailerLink = ({ url }: { url: string }) => (
  <a
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-5 py-2.5 text-sm font-semibold text-zinc-950 no-underline transition hover:bg-amber-300"
  >
    <ExternalLink className="h-4 w-4" />
    Watch Trailer
  </a>
);

/**
 * Play a trailer inline without leaving the detail page. When the URL is a
 * YouTube video the button opens a modal with an embedded player; otherwise it
 * falls back to the original external link. Renders nothing when there is no
 * trailer.
 */
export const TrailerPlayer = ({ url, title }: { url: string | null; title: string }) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  if (!url) {
    return null;
  }

  const videoId = youtubeVideoId(url);
  if (!videoId) {
    return <ExternalTrailerLink url={url} />;
  }

  // Return focus to the trigger when the modal closes so keyboard and
  // assistive-tech users keep their place on the page.
  const handleClose = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-amber-300"
      >
        <Play className="h-4 w-4 fill-zinc-950" />
        Watch Trailer
      </button>
      {open ? <TrailerModal videoId={videoId} title={title} onClose={handleClose} /> : null}
    </>
  );
};
