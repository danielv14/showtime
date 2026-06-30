/** Maps an IMDb episode score to the heatmap cell colours. */

export const RATING_MIN = 6;
export const RATING_MAX = 9;

/**
 * Map an IMDb score to a cell style. Quality is double-encoded: hue runs
 * red->green and lightness rises with the score, so even close ratings read
 * apart. The text color flips on a perceptual-lightness threshold (oklch keeps
 * lightness perceptual, so the threshold is reliable) to stay legible on both
 * dark and bright cells. Scores outside [RATING_MIN, RATING_MAX] clamp to the
 * ends of the scale rather than running off it.
 */
export const ratingStyle = (rating: number): { backgroundColor: string; color: string } => {
  const t = Math.max(0, Math.min(1, (rating - RATING_MIN) / (RATING_MAX - RATING_MIN)));
  const lightness = 0.58 + 0.28 * t;
  const hue = 25 + 120 * t;
  return {
    backgroundColor: `oklch(${lightness.toFixed(3)} 0.16 ${hue.toFixed(1)})`,
    color: lightness > 0.7 ? "#0a0a0a" : "#fafafa",
  };
};
