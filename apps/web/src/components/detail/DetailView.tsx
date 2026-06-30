import type { EpisodeRatingsResult, MediaDetail } from "#/server/media";
import { MediaRow } from "#/components/media/MediaRow";
import { CastList } from "./CastList";
import { DetailHero } from "./DetailHero";
import { EpisodeRatings } from "./EpisodeRatings";
import { Reviews } from "./Reviews";
import { SeasonEpisodes } from "./season-episodes/SeasonEpisodes";
import { WhereToWatch } from "./WhereToWatch";

export const DetailView = ({
  detail,
  ratings,
}: {
  detail: MediaDetail;
  ratings?: Promise<EpisodeRatingsResult> | null;
}) => (
  <div>
    <DetailHero detail={detail} />

    <div className="mx-auto max-w-6xl space-y-10 px-4 pb-4 sm:px-6">
      <section>
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-zinc-100">Where to watch</h2>
        <WhereToWatch data={detail.whereToWatch} />
      </section>

      {detail.mediaType === "tv" && ratings ? (
        <>
          <SeasonEpisodes ratings={ratings} tvId={detail.id} />
          <EpisodeRatings ratings={ratings} />
        </>
      ) : null}

      {detail.cast.length > 0 ? (
        <section>
          <h2 className="mb-4 text-lg font-semibold tracking-tight text-zinc-100">Top cast</h2>
          <CastList cast={detail.cast} />
        </section>
      ) : null}

      <Reviews reviews={detail.reviews} />

      <MediaRow
        title={detail.mediaType === "tv" ? "Similar series" : "Similar movies"}
        items={detail.similar}
      />
    </div>
  </div>
);
