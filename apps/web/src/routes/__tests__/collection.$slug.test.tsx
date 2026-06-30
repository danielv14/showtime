import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import { isNotFound, isRedirect } from "@tanstack/react-router";
import type { CollectionDetail } from "../../server/media.js";

// Mock the server layer so the route module imports without pulling in the
// Cloudflare/server runtime. The loader's own logic (slug validation, canonical
// redirect, pass-through) is the unit under test.
const getCollectionDetail = vi.fn();
vi.mock("../../server/media.js", () => ({ getCollectionDetail }));

const { Route } = await import("../collection.$slug.js");

const runLoader = (slug: string) =>
  (Route.options.loader as (args: { params: { slug: string } }) => Promise<CollectionDetail>)({
    params: { slug },
  });

const detail = (overrides: Partial<CollectionDetail> = {}): CollectionDetail => ({
  id: 2344,
  name: "The Matrix Collection",
  overview: "",
  posterUrl: null,
  backdropUrl: null,
  parts: [],
  ...overrides,
});

describe("collection route loader", () => {
  beforeEach(() => {
    getCollectionDetail.mockReset();
  });

  it("throws notFound for a slug with no trailing numeric id", async () => {
    await expect(runLoader("not-a-collection")).rejects.toSatisfy(isNotFound);
    expect(getCollectionDetail).not.toHaveBeenCalled();
  });

  it("queries TMDB by the trailing id from the slug", async () => {
    getCollectionDetail.mockResolvedValue(detail());
    await runLoader("the-matrix-collection-2344");
    expect(getCollectionDetail).toHaveBeenCalledWith({ data: 2344 });
  });

  it("redirects a non-canonical slug to the canonical title-id form", async () => {
    getCollectionDetail.mockResolvedValue(detail());
    const error = await runLoader("wrong-title-2344").catch((e) => e);
    expect(isRedirect(error)).toBe(true);
    expect(error.options.params.slug).toBe("the-matrix-collection-2344");
  });

  it("returns the collection when the slug is already canonical", async () => {
    const collection = detail();
    getCollectionDetail.mockResolvedValue(collection);
    await expect(runLoader("the-matrix-collection-2344")).resolves.toBe(collection);
  });
});
