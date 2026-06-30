import { useState } from "react";
import { ExternalLink, Star } from "lucide-react";
import type { Review } from "../server/media";

/**
 * Display-level cap for a review's text. The payload is already bounded by
 * core's `formatReview`; this keeps a long review from dominating the layout
 * until the reader chooses to expand it.
 */
const PREVIEW_LENGTH = 280;

const ReviewCard = ({ review }: { review: Review }) => {
  const [expanded, setExpanded] = useState(false);
  const isLong = review.content.length > PREVIEW_LENGTH;
  const text =
    isLong && !expanded ? `${review.content.slice(0, PREVIEW_LENGTH).trimEnd()}…` : review.content;

  return (
    <article className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-zinc-100">{review.author}</span>
          {review.rating !== null ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-2 py-0.5 text-xs font-semibold text-amber-300">
              <Star className="h-3 w-3 fill-amber-300" />
              {review.rating.toFixed(1)}
            </span>
          ) : null}
        </div>
        <a
          href={review.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1 text-xs text-zinc-500 no-underline transition hover:text-zinc-300"
        >
          <ExternalLink className="h-3 w-3" />
          TMDB
        </a>
      </div>

      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-zinc-300">{text}</p>

      {isLong ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-2 text-xs font-medium text-amber-300 transition hover:text-amber-200"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      ) : null}
    </article>
  );
};

// `reviews` is optional at runtime: a detail object cached by an older build
// (before reviews were added) lacks the field, so guard against undefined to
// avoid crashing the whole detail page on stale cache entries.
export const Reviews = ({ reviews }: { reviews?: Review[] }) => {
  if (!reviews || reviews.length === 0) return null;

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold tracking-tight text-zinc-100">Reviews</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>
    </section>
  );
};
