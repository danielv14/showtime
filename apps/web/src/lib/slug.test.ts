import { describe, it, expect } from "vite-plus/test";
import { parseMediaId } from "./slug.js";

describe("parseMediaId", () => {
  it("reads the id from the trailing segment of a hybrid slug", () => {
    expect(parseMediaId("the-matrix-603")).toBe(603);
  });

  it("resolves a bare numeric slug", () => {
    expect(parseMediaId("603")).toBe(603);
  });

  it("returns null when the trailing segment is not numeric", () => {
    expect(parseMediaId("the-matrix")).toBeNull();
  });

  it("returns null for a zero id", () => {
    expect(parseMediaId("title-0")).toBeNull();
  });

  it("returns null for an empty trailing segment", () => {
    expect(parseMediaId("title-")).toBeNull();
  });

  it("returns null for a non-integer trailing segment", () => {
    expect(parseMediaId("title-1.5")).toBeNull();
  });
});
