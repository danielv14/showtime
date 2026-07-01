import { describe, it, expect } from "vite-plus/test";
import { parseMediaId, parsePersonId, toMediaSlug, toPersonSlug } from "./slug.js";

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

  it("rejects scientific and hex notation rather than coercing it to an id", () => {
    // `Number("6e2")` is 600 and `Number("0x10")` is 16; a plain-digit guard
    // keeps a cosmetic title ending in such a token from resolving to a real id.
    expect(parseMediaId("the-matrix-6e2")).toBeNull();
    expect(parseMediaId("title-0x10")).toBeNull();
  });
});

describe("person slug round-trip", () => {
  it("builds a name-id slug and parses the id back out", () => {
    const slug = toPersonSlug({ id: 45400, name: "Greta Gerwig" });
    expect(slug).toBe("greta-gerwig-45400");
    expect(parsePersonId(slug)).toBe(45400);
  });

  it("resolves a bare-id person slug", () => {
    expect(parsePersonId("45400")).toBe(45400);
  });

  it("resolves a stripped-title person slug (id only after a dash)", () => {
    expect(parsePersonId("-45400")).toBe(45400);
  });

  it("falls back to the bare id when the name has no slug-able characters", () => {
    expect(toPersonSlug({ id: 500, name: "!!!" })).toBe("500");
  });

  it("shares the trailing-id convention with media slugs", () => {
    expect(parsePersonId(toMediaSlug({ id: 603, title: "The Matrix" }))).toBe(603);
  });

  it("returns null for a non-numeric person slug", () => {
    expect(parsePersonId("greta-gerwig")).toBeNull();
  });

  it("falls back to the bare id when a credit has no name (no crash)", () => {
    // A cast/crew entry can arrive without a name; building its link must not
    // throw on `String.prototype.normalize`, it must degrade to the id slug.
    expect(toPersonSlug({ id: 42, name: undefined })).toBe("42");
    expect(toPersonSlug({ id: 42, name: null })).toBe("42");
    expect(toMediaSlug({ id: 42, title: undefined })).toBe("42");
  });
});
