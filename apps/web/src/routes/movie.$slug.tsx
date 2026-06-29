import { createFileRoute, redirect } from "@tanstack/react-router";
import { getMovieDetail } from "../server/media";
import { DetailView } from "../components/DetailView";
import { mediaMeta } from "../lib/seo";
import { parseMediaId, toMediaSlug } from "../lib/slug";

const MovieDetailPage = () => <DetailView detail={Route.useLoaderData()} />;

export const Route = createFileRoute("/movie/$slug")({
  loader: async ({ params }) => {
    const detail = await getMovieDetail({ data: parseMediaId(params.slug) });
    const canonical = toMediaSlug(detail);
    if (params.slug !== canonical) {
      throw redirect({
        to: "/movie/$slug",
        params: { slug: canonical },
        replace: true,
      });
    }
    return detail;
  },
  head: ({ loaderData }) => ({ meta: loaderData ? mediaMeta(loaderData) : [] }),
  component: MovieDetailPage,
});
