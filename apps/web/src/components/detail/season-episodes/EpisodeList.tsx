import { useState } from "react";
import { ChevronDown, Star } from "lucide-react";
import type { EpisodeRating, EpisodeRatingsData, SeasonRatings } from "#/server/media";
import { formatAirDate } from "#/lib/date";
import { EpisodeDetailPanel } from "./EpisodeDetailPanel";

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

export const EpisodeList = ({ data, tvId }: { data: EpisodeRatingsData; tvId: number }) => {
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
