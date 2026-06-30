import { useEffect, useState } from "react";
import { Await } from "@tanstack/react-router";
import { AlertCircle, ChevronDown, Loader2, Star } from "lucide-react";
import {
  getEpisodeDetail,
  type EpisodeDetail,
  type EpisodeRating,
  type EpisodeRatingsData,
  type SeasonRatings,
} from "../server/media";

const formatAirDate = (airDate: string): string => {
  // OMDB air dates arrive as "DD Mon YYYY"; pass through anything else as-is.
  const parsed = new Date(airDate);
  if (Number.isNaN(parsed.getTime())) return airDate;
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const RatingBadge = ({ rating }: { rating: number | null }) => {
  if (rating === null) {
    return <span className="text-xs text-zinc-600">Not rated</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold tabular-nums text-amber-300">
      <Star className="h-3.5 w-3.5 fill-amber-300" />
      {rating.toFixed(1)}
    </span>
  );
};

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
const EpisodeDetailPanel = ({
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

const EpisodeRow = ({
  episode,
  season,
  tvId,
  open,
  onToggle,
}: {
  episode: EpisodeRating;
  season: number;
  tvId: number;
  open: boolean;
  onToggle: () => void;
}) => (
  <li className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.02]">
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-white/[0.04]"
    >
      <span className="w-8 shrink-0 text-center text-sm font-semibold tabular-nums text-zinc-500">
        {episode.episode}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-zinc-100">{episode.title}</span>
        {episode.airDate ? (
          <span className="block text-xs text-zinc-500">{formatAirDate(episode.airDate)}</span>
        ) : null}
      </span>
      <RatingBadge rating={episode.rating} />
      <ChevronDown
        className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}
      />
    </button>
    {open ? <EpisodeDetailPanel tvId={tvId} season={season} episode={episode.episode} /> : null}
  </li>
);

const SeasonPicker = ({
  seasons,
  selected,
  onSelect,
}: {
  seasons: SeasonRatings[];
  selected: number;
  onSelect: (season: number) => void;
}) => (
  <div className="flex flex-wrap gap-2" role="tablist" aria-label="Seasons">
    {seasons.map((season) => {
      const active = season.season === selected;
      return (
        <button
          key={season.season}
          type="button"
          role="tab"
          aria-selected={active}
          onClick={() => onSelect(season.season)}
          className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
            active
              ? "border-amber-400/60 bg-amber-400/10 text-amber-200"
              : "border-white/10 bg-white/5 text-zinc-300 hover:border-white/25 hover:text-white"
          }`}
        >
          Season {season.season}
        </button>
      );
    })}
  </div>
);

const EpisodeList = ({ data, tvId }: { data: EpisodeRatingsData; tvId: number }) => {
  // Default to the first available season; with season gaps this is whatever the
  // shaped data leads with, not necessarily season 1.
  const [selectedSeason, setSelectedSeason] = useState(data.seasons[0]?.season ?? 0);
  // Track the open episode as "season-episode" so switching seasons collapses
  // any open row and one row is open at a time.
  const [openKey, setOpenKey] = useState<string | null>(null);

  const season =
    data.seasons.find((candidate) => candidate.season === selectedSeason) ?? data.seasons[0];
  if (!season) return null;

  return (
    <div className="space-y-4">
      <SeasonPicker
        seasons={data.seasons}
        selected={season.season}
        onSelect={(next) => {
          setSelectedSeason(next);
          setOpenKey(null);
        }}
      />
      <ul className="space-y-2">
        {season.episodes.map((episode) => {
          const key = `${season.season}-${episode.episode}`;
          return (
            <EpisodeRow
              key={key}
              episode={episode}
              season={season.season}
              tvId={tvId}
              open={openKey === key}
              onToggle={() => setOpenKey((current) => (current === key ? null : key))}
            />
          );
        })}
      </ul>
    </div>
  );
};

const Loading = () => (
  <div className="flex items-center gap-2 text-sm text-zinc-500">
    <Loader2 className="h-4 w-4 animate-spin" />
    Loading seasons…
  </div>
);

const Empty = () => (
  <p className="text-sm text-zinc-500">No season data available for this series.</p>
);

/**
 * The resolved-data view: season picker + episode list, or the empty state when
 * the series has no usable season data (including when the loader's streamed
 * fetch resolved to `null`). Kept separate from the `Await` wrapper so it renders
 * synchronously from already-resolved data, which is also what the tests drive.
 */
export const SeasonEpisodesContent = ({
  data,
  tvId,
}: {
  data: EpisodeRatingsData | null;
  tvId: number;
}) => {
  if (!data || data.seasons.length === 0) {
    return <Empty />;
  }
  return <EpisodeList data={data} tvId={tvId} />;
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
  ratings: Promise<EpisodeRatingsData | null>;
  tvId: number;
}) => (
  <section>
    <div>
      <h2 className="text-lg font-semibold tracking-tight text-zinc-100">Seasons &amp; episodes</h2>
      <p className="text-xs text-zinc-500">Browse episodes by season</p>
    </div>
    <div className="mt-4">
      <Await promise={ratings} fallback={<Loading />}>
        {(data) => <SeasonEpisodesContent data={data} tvId={tvId} />}
      </Await>
    </div>
  </section>
);
