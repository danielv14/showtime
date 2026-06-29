import { describe, it, expect } from "vite-plus/test";
import { parseTotalSeasons } from "../client.js";

describe("parseTotalSeasons", () => {
  it("parses a numeric season count", () => {
    expect(parseTotalSeasons("6")).toBe(6);
  });

  it('treats OMDB "N/A" as zero seasons', () => {
    expect(parseTotalSeasons("N/A")).toBe(0);
  });

  it("treats undefined as zero seasons", () => {
    expect(parseTotalSeasons(undefined)).toBe(0);
  });

  it("treats a non-positive count as zero seasons", () => {
    expect(parseTotalSeasons("0")).toBe(0);
    expect(parseTotalSeasons("-3")).toBe(0);
  });
});
