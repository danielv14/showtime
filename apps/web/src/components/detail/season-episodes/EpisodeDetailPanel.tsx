import { useQuery } from "@tanstack/react-query";
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
 * Loads and renders the on-demand detail (plot, cast) for one episode via
 * `useQuery`, keyed to the series/season/episode so each episode owns its own
 * cache entry. The query key handles the race a slow response would otherwise
 * create, and the cache means reopening an episode shows its detail instantly
 * instead of refetching. Episode detail is effectively immutable, so it never
 * goes stale within a session.
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
  const { data, isPending, isError } = useQuery({
    queryKey: ["episode-detail", tvId, season, episode],
    queryFn: () => getEpisodeDetail({ data: { tvId, season, episode } }),
    staleTime: Infinity,
  });

  return (
    <div className="border-t border-white/5 px-3 py-3">
      {isPending ? <DetailLoading /> : null}
      {isError ? <DetailError /> : null}
      {data ? <EpisodeDetailBody detail={data} /> : null}
    </div>
  );
};
