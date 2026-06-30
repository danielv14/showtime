import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { getMovieDetail } from "../server/media";
import { DetailView } from "#/components/detail/DetailView";
import { mediaMeta } from "../lib/seo";
import { parseMediaId, toMediaSlug } from "../lib/slug";

const MovieDetailPage = () => <DetailView detail={Route.useLoaderData()} />;

export const Route = createFileRoute("/movie/$slug")({
  loader: async ({ params }) => {
    const id = parseMediaId(params.slug);
    if (id === null) throw notFound();
    const detail = await getMovieDetail({ data: id });
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
