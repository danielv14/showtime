import type { EpisodeRating, EpisodeRatingsData, SeasonRatings } from "#/server/media";
import { ratingStyle } from "#/lib/ratings";

/** Cell footprint; the season header and episode cells share the column width. */
const COL_W = "w-11";
const CELL = `h-7 ${COL_W}`;

const EpisodeCell = ({ episode }: { episode: EpisodeRating | undefined }) => {
  if (!episode) {
    return <div className={`${CELL} shrink-0`} />;
  }
  if (episode.rating === null) {
    return (
      <div
        className={`flex ${CELL} shrink-0 items-center justify-center rounded bg-white/[0.04] text-[10px] text-zinc-600`}
        title={`${episode.title} · not rated`}
      >
        –
      </div>
    );
  }
  return (
    <div
      className={`flex ${CELL} shrink-0 items-center justify-center rounded text-[10px] font-semibold tabular-nums`}
      style={ratingStyle(episode.rating)}
      title={`${episode.title} · ${episode.rating.toFixed(1)}`}
    >
      {episode.rating.toFixed(1)}
    </div>
  );
};

/** Seasons run across as columns; episode numbers run down as rows. */
const Heatmap = ({ data }: { data: EpisodeRatingsData }) => {
  const columns = data.seasons.map((season: SeasonRatings) => ({
    season: season.season,
    average: season.average,
    byNumber: new Map(season.episodes.map((ep) => [ep.episode, ep])),
  }));
  const episodeRows = Array.from({ length: data.maxEpisodes }, (_, i) => i + 1);

  return (
    <div className="overflow-x-auto pb-2">
      <div className="inline-flex flex-col gap-1">
        <div className="flex gap-1">
          <div className="sticky left-0 z-10 w-7 shrink-0 bg-zinc-950" />
          {columns.map((column) => (
            <div
              key={column.season}
              className={`flex ${COL_W} shrink-0 flex-col items-center leading-none`}
            >
              <span className="text-xs font-semibold text-zinc-300">S{column.season}</span>
              {column.average !== null ? (
                <span className="mt-0.5 text-[9px] tabular-nums text-zinc-500">
                  ⌀ {column.average.toFixed(1)}
                </span>
              ) : null}
            </div>
          ))}
        </div>

        {episodeRows.map((episodeNumber) => (
          <div key={episodeNumber} className="flex items-center gap-1">
            <div className="sticky left-0 z-10 w-7 shrink-0 bg-zinc-950 pr-1 text-right text-[10px] tabular-nums text-zinc-600">
              {episodeNumber}
            </div>
            {columns.map((column) => (
              <EpisodeCell key={column.season} episode={column.byNumber.get(episodeNumber)} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

const Legend = () => (
  <div className="flex items-center gap-2 text-[10px] tabular-nums text-zinc-500">
    <span>6</span>
    <span
      className="h-2 w-28 rounded-full"
      style={{
        background:
          "linear-gradient(to right, oklch(0.58 0.16 25), oklch(0.72 0.16 85), oklch(0.86 0.16 145))",
      }}
    />
    <span>9</span>
    <span className="ml-1">IMDb</span>
  </div>
);

/** Season-by-episode IMDb heatmap with its colour legend. */
export const RatingsHeatmap = ({ data }: { data: EpisodeRatingsData }) => (
  <div className="space-y-4">
    <Heatmap data={data} />
    <Legend />
  </div>
);
