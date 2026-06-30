import { useEffect, useRef, useState } from "react";
import { ExternalLink, Play, X } from "lucide-react";

/**
 * Pull the YouTube video id out of a watch URL. `selectTrailerUrl` only ever
 * returns `https://www.youtube.com/watch?v=KEY`, but we parse defensively and
 * return null on anything we don't recognise so the caller can fall back to the
 * plain external link rather than rendering a broken player.
 */
const youtubeVideoId = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "youtu.be") {
      return parsed.pathname.slice(1) || null;
    }
    if (parsed.hostname.endsWith("youtube.com")) {
      return parsed.searchParams.get("v");
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * The embed URL for the modal player. `autoplay=1` only ever applies here, and
 * the iframe is mounted solely while the modal is open (after a user click), so
 * nothing autoplays on initial page load. `rel=0` keeps related videos scoped
 * to the same channel.
 */
const youtubeEmbedUrl = (videoId: string): string =>
  `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;

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

const TrailerModal = ({
  videoId,
  title,
  onClose,
}: {
  videoId: string;
  title: string;
  onClose: () => void;
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const focusable = () =>
      Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") {
        return;
      }
      // Trap Tab focus inside the dialog so keyboard users cannot reach the
      // page behind the overlay while the modal is open.
      const elements = focusable();
      if (elements.length === 0) {
        return;
      }
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    // Move focus into the dialog so keyboard users land on the close control.
    closeButtonRef.current?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${title} trailer`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="relative w-full max-w-4xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          ref={closeButtonRef}
          onClick={onClose}
          aria-label="Close trailer"
          className="absolute -top-2 right-0 inline-flex -translate-y-full items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-semibold text-zinc-100 transition hover:bg-white/20"
        >
          <X className="h-4 w-4" />
          Close
        </button>
        <div className="aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black shadow-2xl shadow-black/60">
          <iframe
            src={youtubeEmbedUrl(videoId)}
            title={`${title} trailer`}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
};

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
