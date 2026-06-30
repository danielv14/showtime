import { describe, it, expect } from "vite-plus/test";
import { ratingStyle, RATING_MAX, RATING_MIN } from "./ratings.js";

describe("ratingStyle", () => {
  it("produces an oklch background colour", () => {
    expect(ratingStyle(7.5).backgroundColor).toMatch(/^oklch\(/);
  });

  it("uses light text on the dark low end and dark text on the bright high end", () => {
    expect(ratingStyle(RATING_MIN).color).toBe("#fafafa");
    expect(ratingStyle(RATING_MAX).color).toBe("#0a0a0a");
  });

  it("clamps scores below the minimum to the low end of the scale", () => {
    expect(ratingStyle(RATING_MIN - 3)).toEqual(ratingStyle(RATING_MIN));
  });

  it("clamps scores above the maximum to the high end of the scale", () => {
    expect(ratingStyle(RATING_MAX + 3)).toEqual(ratingStyle(RATING_MAX));
  });
});
