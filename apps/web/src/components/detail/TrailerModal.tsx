import { useRef } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { youtubeEmbedUrl } from "#/lib/youtube";

/**
 * The trailer overlay: an embedded YouTube player in a modal dialog. Built on
 * Base UI's Dialog, which provides focus trapping, Escape-to-close, the top
 * layer and outside-press dismissal for free. The iframe mounts only here
 * (while open), which is what keeps autoplay scoped to a deliberate user action
 * rather than page load. Focus return to the trigger is owned by the caller
 * (`TrailerPlayer.handleClose`), so the dialog opts out of its own final focus.
 */
export const TrailerModal = ({
  videoId,
  title,
  onClose,
}: {
  videoId: string;
  title: string;
  onClose: () => void;
}) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/80" />
        <Dialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Popup
            // The close control is the first tabbable element, so this matches
            // Base UI's default initial focus, but pinning it to a ref keeps
            // focus landing deterministic across interaction types.
            initialFocus={closeButtonRef}
            // Focus return to the trigger is the caller's job
            // (`TrailerPlayer.handleClose`), so opt out of the dialog's own.
            finalFocus={false}
            // Base UI relies on focus trapping plus inert siblings for
            // modality; restate `aria-modal` so the semantics stay explicit.
            aria-modal="true"
            aria-label={`${title} trailer`}
            className="relative w-full max-w-4xl outline-none"
          >
            <Dialog.Close
              ref={closeButtonRef}
              aria-label="Close trailer"
              className="absolute -top-2 right-0 inline-flex -translate-y-full items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-semibold text-zinc-100 transition hover:bg-white/20"
            >
              <X className="h-4 w-4" />
              Close
            </Dialog.Close>
            <div className="aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black shadow-2xl shadow-black/60">
              <iframe
                src={youtubeEmbedUrl(videoId)}
                title={`${title} trailer`}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
