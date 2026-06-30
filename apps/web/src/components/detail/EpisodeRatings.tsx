import { useState } from "react";
import { Await } from "@tanstack/react-router";
import { ChevronDown, Loader2 } from "lucide-react";
import type { EpisodeRatingsResult } from "#/server/media";
import { RatingsHeatmap } from "./RatingsHeatmap";

const Loading = () => (
  <div className="flex items-center gap-2 text-sm text-zinc-500">
    <Loader2 className="h-4 w-4 animate-spin" />
    Loading episode ratings…
  </div>
);

const Empty = () => (
  <p className="text-sm text-zinc-500">No episode ratings available for this series.</p>
);

const Unavailable = () => (
  <p className="text-sm text-zinc-500">
    Episode ratings are temporarily unavailable. Please try again later.
  </p>
);

/**
 * The ratings promise is streamed from the route loader, so it's keyed to the
 * series by the route match. The panel stays collapsed until opened; by then
 * the promise has usually resolved, so `Await` renders without a spinner. A
 * failed fetch resolves to `unavailable` so we can say so rather than render an
 * empty section.
 */
export const EpisodeRatings = ({ ratings }: { ratings: Promise<EpisodeRatingsResult> }) => {
  const [open, setOpen] = useState(false);

  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-lg text-left"
      >
        <span>
          <span className="block text-lg font-semibold tracking-tight text-zinc-100">
            Episode ratings
          </span>
          <span className="text-xs text-zinc-500">IMDb score per episode</span>
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div className="mt-4">
          <Await promise={ratings} fallback={<Loading />}>
            {(result) =>
              result.status === "unavailable" ? (
                <Unavailable />
              ) : result.data.seasons.length > 0 ? (
                <RatingsHeatmap data={result.data} />
              ) : (
                <Empty />
              )
            }
          </Await>
        </div>
      ) : null}
    </section>
  );
};
