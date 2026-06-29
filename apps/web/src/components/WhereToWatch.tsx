import type { WatchProvider, WhereToWatch as WhereToWatchData } from "../server/media";

const ProviderGroup = ({
  label,
  providers,
}: {
  label: string;
  providers: WatchProvider[];
}) => {
  if (providers.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-16 shrink-0 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      {providers.map((provider) => (
        <span
          key={provider.name}
          title={provider.name}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 py-1 pl-1 pr-2.5 text-xs text-zinc-200"
        >
          {provider.logoUrl ? (
            <img
              src={provider.logoUrl}
              alt={provider.name}
              className="h-6 w-6 rounded-md"
            />
          ) : null}
          {provider.name}
        </span>
      ))}
    </div>
  );
};

export const WhereToWatch = ({ data }: { data: WhereToWatchData | null }) => {
  if (
    !data ||
    (data.flatrate.length === 0 &&
      data.rent.length === 0 &&
      data.buy.length === 0)
  ) {
    return (
      <p className="text-sm text-zinc-500">
        No streaming availability found for your region.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-zinc-500">
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
      <ProviderGroup label="Stream" providers={data.flatrate} />
      <ProviderGroup label="Rent" providers={data.rent} />
      <ProviderGroup label="Buy" providers={data.buy} />
    </div>
  );
};
