import type { WhereToWatch as WhereToWatchData } from "../server/media";

export const WhereToWatch = ({ data }: { data: WhereToWatchData | null }) => {
  if (!data || data.flatrate.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Not available on streaming in your region.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-xs text-zinc-500">
        <span>Region: {data.region}</span>
        {data.link ? (
          <a
            href={data.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-300 hover:text-amber-200"
          >
            View on JustWatch ↗
          </a>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {data.flatrate.map((provider) => (
          <span
            key={provider.name}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 py-1 pl-1 pr-3 text-sm text-zinc-200"
          >
            {provider.logoUrl ? (
              <img
                src={provider.logoUrl}
                alt={provider.name}
                className="h-7 w-7 rounded-md"
              />
            ) : null}
            {provider.name}
          </span>
        ))}
      </div>
    </div>
  );
};
