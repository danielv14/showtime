import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { getPersonDetail } from "../server/media";
import { PersonView } from "#/components/person/PersonView";
import { personMeta } from "../lib/seo";
import { parsePersonId, toPersonSlug } from "../lib/slug";

const PersonDetailPage = () => <PersonView person={Route.useLoaderData()} />;

export const Route = createFileRoute("/person/$slug")({
  loader: async ({ params }) => {
    const id = parsePersonId(params.slug);
    if (id === null) throw notFound();
    const person = await getPersonDetail({ data: id });
    const canonical = toPersonSlug(person);
    if (params.slug !== canonical) {
      throw redirect({
        to: "/person/$slug",
        params: { slug: canonical },
        replace: true,
      });
    }
    return person;
  },
  head: ({ loaderData }) => ({ meta: loaderData ? personMeta(loaderData) : [] }),
  component: PersonDetailPage,
});
