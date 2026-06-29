import { createFileRoute } from "@tanstack/react-router";
import { getMovieDetail } from "../server/media";
import { DetailView } from "../components/DetailView";

const MovieDetailPage = () => <DetailView detail={Route.useLoaderData()} />;

export const Route = createFileRoute("/movie/$id")({
  loader: ({ params }) => getMovieDetail({ data: Number(params.id) }),
  component: MovieDetailPage,
});
