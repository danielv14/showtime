import { Await } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import type { EpisodeRatingsResult } from "#/server/media";
import { EpisodeList } from "./EpisodeList";

const Loading = () => (
  <div className="flex items-center gap-2 text-sm text-zinc-500">
    <Loader2 className="h-4 w-4 animate-spin" />
    Loading seasons…
  </div>
);

const Empty = () => (
  <p className="text-sm text-zinc-500">No season data available for this series.</p>
);

const Unavailable = () => (
  <p className="text-sm text-zinc-500">
    Episode data is temporarily unavailable. Please try again later.
  </p>
);

/**
 * The resolved-data view: season picker + episode list, the empty state when the
 * series has no usable season data, or a temporarily-unavailable message when the
 * streamed fetch failed. Kept separate from the `Await` wrapper so it renders
 * synchronously from an already-resolved result, which is also what the tests
 * drive.
 */
export const SeasonEpisodesContent = ({
  result,
  tvId,
}: {
  result: EpisodeRatingsResult;
  tvId: number;
}) => {
  if (result.status === "unavailable") {
    return <Unavailable />;
  }
  if (result.data.seasons.length === 0) {
    return <Empty />;
  }
  return <EpisodeList data={result.data} tvId={tvId} />;
};

/**
 * Season picker + episode list for a TV detail page. It consumes the same
 * streamed `getEpisodeRatings` promise the heatmap does, via `Await`, so this
 * section streams server-side alongside the heatmap instead of popping in after
 * client hydration. Listing a season's episodes (number, title, air date, IMDb
 * rating) costs no extra fetch; opening an individual episode is the only thing
 * that triggers a new fetch, via `getEpisodeDetail` (TMDB), for the plot and
 * guest stars.
 *
 * `tvId` (the TMDB id) is what the per-episode fetch needs.
 */
export const SeasonEpisodes = ({
  ratings,
  tvId,
}: {
  ratings: Promise<EpisodeRatingsResult>;
  tvId: number;
}) => (
  <section>
    <div>
      <h2 className="text-lg font-semibold tracking-tight text-zinc-100">Seasons &amp; episodes</h2>
      <p className="text-xs text-zinc-500">Browse episodes by season</p>
    </div>
    <div className="mt-4">
      <Await promise={ratings} fallback={<Loading />}>
        {(result) => <SeasonEpisodesContent result={result} tvId={tvId} />}
      </Await>
    </div>
  </section>
);
