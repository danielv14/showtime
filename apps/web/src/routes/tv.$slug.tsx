import { createFileRoute, redirect } from "@tanstack/react-router";
import { getTvDetail } from "../server/media";
import { DetailView } from "../components/DetailView";
import { mediaMeta } from "../lib/seo";
import { parseMediaId, toMediaSlug } from "../lib/slug";

const TvDetailPage = () => <DetailView detail={Route.useLoaderData()} />;

export const Route = createFileRoute("/tv/$slug")({
  loader: async ({ params }) => {
    const detail = await getTvDetail({ data: parseMediaId(params.slug) });
    const canonical = toMediaSlug(detail);
    if (params.slug !== canonical) {
      throw redirect({
        to: "/tv/$slug",
        params: { slug: canonical },
        replace: true,
      });
    }
    return detail;
  },
  head: ({ loaderData }) => ({ meta: loaderData ? mediaMeta(loaderData) : [] }),
  component: TvDetailPage,
});
