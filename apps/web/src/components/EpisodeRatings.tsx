import { useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { getEpisodeRatings } from "../server/media";
import type { EpisodeRating, EpisodeRatingsData, SeasonRatings } from "../server/media";

/** Cell footprint; the season header and episode cells share the column width. */
const COL_W = "w-11";
const CELL = `h-7 ${COL_W}`;

const RATING_MIN = 6;
const RATING_MAX = 9;

/**
 * Map an IMDb score to a cell style. Quality is double-encoded: hue runs
 * red->green and lightness rises with the score, so even close ratings read
 * apart. The text color flips on a perceptual-lightness threshold (oklch keeps
 * lightness perceptual, so the threshold is reliable) to stay legible on both
 * dark and bright cells.
 */
const ratingStyle = (rating: number): { backgroundColor: string; color: string } => {
  const t = Math.max(0, Math.min(1, (rating - RATING_MIN) / (RATING_MAX - RATING_MIN)));
  const lightness = 0.58 + 0.28 * t;
  const hue = 25 + 120 * t;
  return {
    backgroundColor: `oklch(${lightness.toFixed(3)} 0.16 ${hue.toFixed(1)})`,
    color: lightness > 0.7 ? "#0a0a0a" : "#fafafa",
  };
};

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

type LoadStatus = "idle" | "loading" | "done" | "error";

export const EpisodeRatings = ({ imdbId }: { imdbId: string }) => {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [data, setData] = useState<EpisodeRatingsData | null>(null);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (!next || status !== "idle") return;

    setStatus("loading");
    try {
      const result = await getEpisodeRatings({ data: imdbId });
      setData(result);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  const hasData = status === "done" && data && data.seasons.length > 0;

  return (
    <section>
      <button
        type="button"
        onClick={toggle}
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
          {status === "loading" ? (
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading episode ratings…
            </div>
          ) : null}

          {status === "error" ? (
            <p className="text-sm text-zinc-500">Couldn&apos;t load episode ratings.</p>
          ) : null}

          {status === "done" && !hasData ? (
            <p className="text-sm text-zinc-500">No episode ratings available for this series.</p>
          ) : null}

          {hasData ? (
            <div className="space-y-4">
              <Heatmap data={data} />
              <Legend />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
};
