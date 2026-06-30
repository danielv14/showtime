import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { getCollectionDetail } from "../server/media";
import { CollectionView } from "../components/CollectionView";
import { collectionMeta } from "../lib/seo";
import { parseCollectionId, toCollectionSlug } from "../lib/slug";

const CollectionPage = () => <CollectionView collection={Route.useLoaderData()} />;

export const Route = createFileRoute("/collection/$slug")({
  loader: async ({ params }) => {
    const id = parseCollectionId(params.slug);
    if (id === null) throw notFound();
    const collection = await getCollectionDetail({ data: id });
    const canonical = toCollectionSlug(collection);
    if (params.slug !== canonical) {
      throw redirect({
        to: "/collection/$slug",
        params: { slug: canonical },
        replace: true,
      });
    }
    return collection;
  },
  head: ({ loaderData }) => ({ meta: loaderData ? collectionMeta(loaderData) : [] }),
  component: CollectionPage,
});
