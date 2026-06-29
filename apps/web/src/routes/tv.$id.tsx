import { createFileRoute } from "@tanstack/react-router";
import { getTvDetail } from "../server/media";
import { DetailView } from "../components/DetailView";

const TvDetailPage = () => <DetailView detail={Route.useLoaderData()} />;

export const Route = createFileRoute("/tv/$id")({
  loader: ({ params }) => getTvDetail({ data: Number(params.id) }),
  component: TvDetailPage,
});
