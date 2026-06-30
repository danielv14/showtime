import { useEffect, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { getEpisodeDetail, type EpisodeDetail } from "#/server/media";

const DetailLoading = () => (
  <div className="flex items-center gap-2 text-xs text-zinc-500">
    <Loader2 className="h-3.5 w-3.5 animate-spin" />
    Loading episode details…
  </div>
);

const DetailError = () => (
  <div className="flex items-center gap-2 text-xs text-rose-400">
    <AlertCircle className="h-3.5 w-3.5" />
    Episode details are temporarily unavailable.
  </div>
);

const EpisodeDetailBody = ({ detail }: { detail: EpisodeDetail }) => (
  <div className="space-y-3">
    {detail.plot ? (
      <p className="text-sm leading-relaxed text-zinc-300">{detail.plot}</p>
    ) : (
      <p className="text-xs text-zinc-500">No synopsis available.</p>
    )}
    {detail.cast.length > 0 ? (
      <div>
        <span className="block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          Cast
        </span>
        <p className="mt-1 text-sm text-zinc-300">{detail.cast.join(", ")}</p>
      </div>
    ) : null}
  </div>
);

/**
 * Loads and renders the on-demand detail (plot, cast) for one episode. Runs the
 * fetch in an effect keyed to the episode so reopening a different episode
 * refetches, and tracks loading/error/data locally so each open row owns its
 * own state. The effect guards against setting state after unmount/episode
 * change so a slow response cannot land on the wrong row.
 */
export const EpisodeDetailPanel = ({
  tvId,
  season,
  episode,
}: {
  tvId: number;
  season: number;
  episode: number;
}) => {
  const [state, setState] = useState<
    { status: "loading" } | { status: "error" } | { status: "ready"; detail: EpisodeDetail }
  >({ status: "loading" });

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    const load = async () => {
      try {
        const detail = await getEpisodeDetail({ data: { tvId, season, episode } });
        if (active) setState({ status: "ready", detail });
      } catch {
        if (active) setState({ status: "error" });
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [tvId, season, episode]);

  return (
    <div className="border-t border-white/5 px-3 py-3">
      {state.status === "loading" ? <DetailLoading /> : null}
      {state.status === "error" ? <DetailError /> : null}
      {state.status === "ready" ? <EpisodeDetailBody detail={state.detail} /> : null}
    </div>
  );
};
