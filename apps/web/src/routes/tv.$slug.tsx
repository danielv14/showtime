import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { getEpisodeRatings, getTvDetail } from "#/server/media";
import { DetailView } from "#/components/detail/DetailView";
import { mediaMeta } from "#/lib/seo";
import { parseMediaId, toMediaSlug } from "#/lib/slug";

const TvDetailPage = () => {
  const { detail, ratings } = Route.useLoaderData();
  return <DetailView detail={detail} ratings={ratings} />;
};

export const Route = createFileRoute("/tv/$slug")({
  loader: async ({ params }) => {
    const id = parseMediaId(params.slug);
    if (id === null) throw notFound();
    const detail = await getTvDetail({ data: id });
    const canonical = toMediaSlug(detail);
    if (params.slug !== canonical) {
      throw redirect({
        to: "/tv/$slug",
        params: { slug: canonical },
        replace: true,
      });
    }
    // Episode ratings are the heaviest OMDB consumer, so we don't block the
    // page on them. Returning the unawaited promise lets TanStack Start stream
    // it in; the route match owns the promise, so navigating to another series
    // hands down a fresh one and the heatmap can never show stale data.
    //
    // A failed fetch (e.g. OMDB rate-limited with nothing cached yet) resolves
    // to `unavailable` rather than `null` so the UI can say the data is
    // temporarily unavailable instead of silently rendering an empty section.
    // The failure is logged so it shows up in Workers Logs.
    const ratings = detail.imdbId
      ? getEpisodeRatings({ data: detail.imdbId })
          .then((data) => ({ status: "ready" as const, data }))
          .catch((error: unknown) => {
            console.error(
              "upstream fetch failed",
              { fetch: "getEpisodeRatings", imdbId: detail.imdbId },
              error,
            );
            return { status: "unavailable" as const };
          })
      : null;
    return { detail, ratings };
  },
  head: ({ loaderData }) => ({ meta: loaderData ? mediaMeta(loaderData.detail) : [] }),
  component: TvDetailPage,
});
