import { describe, it, expect } from "vite-plus/test";
import type { CollectionDetail, MediaDetail, PersonDetail } from "../server/media.js";
import { collectionMeta, mediaMeta, personMeta } from "./seo.js";

// The builders only read a handful of fields off each detail shape, so the
// fixtures are minimal partials cast to the full type rather than complete
// objects. The assertions below pin the full emitted array so the shared
// `buildMeta` refactor stays byte-identical for both image branches.

describe("mediaMeta", () => {
  it("emits the full meta set including image tags when a backdrop is present", () => {
    const detail = {
      mediaType: "movie",
      title: "The Matrix",
      year: "1999",
      overview: "A hacker discovers reality is a simulation.",
      backdropUrl: "https://img/backdrop.jpg",
      posterUrl: "https://img/poster.jpg",
    } as MediaDetail;

    expect(mediaMeta(detail)).toEqual([
      { title: "The Matrix (1999) — Showtime" },
      { name: "description", content: "A hacker discovers reality is a simulation." },
      { property: "og:title", content: "The Matrix (1999) — Showtime" },
      {
        property: "og:description",
        content: "A hacker discovers reality is a simulation.",
      },
      { property: "og:type", content: "video.movie" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "The Matrix (1999) — Showtime" },
      {
        name: "twitter:description",
        content: "A hacker discovers reality is a simulation.",
      },
      { property: "og:image", content: "https://img/backdrop.jpg" },
      { name: "twitter:image", content: "https://img/backdrop.jpg" },
    ]);
  });

  it("omits the image tags but keeps the large-image card when no image exists", () => {
    const detail = {
      mediaType: "tv",
      title: "Some Show",
      year: "2020",
      overview: "",
      backdropUrl: null,
      posterUrl: null,
    } as MediaDetail;

    expect(mediaMeta(detail)).toEqual([
      { title: "Some Show (2020) — Showtime" },
      {
        name: "description",
        content: "Find ratings and where to watch Some Show on Showtime.",
      },
      { property: "og:title", content: "Some Show (2020) — Showtime" },
      {
        property: "og:description",
        content: "Find ratings and where to watch Some Show on Showtime.",
      },
      { property: "og:type", content: "video.tv_show" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Some Show (2020) — Showtime" },
      {
        name: "twitter:description",
        content: "Find ratings and where to watch Some Show on Showtime.",
      },
    ]);
  });
});

describe("personMeta", () => {
  it("uses the large-image card and appends image tags when a profile image is present", () => {
    const person = {
      name: "Greta Gerwig",
      biography: "A director and actress.",
      profileUrl: "https://img/profile.jpg",
    } as PersonDetail;

    expect(personMeta(person)).toEqual([
      { title: "Greta Gerwig — Showtime" },
      { name: "description", content: "A director and actress." },
      { property: "og:title", content: "Greta Gerwig — Showtime" },
      { property: "og:description", content: "A director and actress." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Greta Gerwig — Showtime" },
      { name: "twitter:description", content: "A director and actress." },
      { property: "og:image", content: "https://img/profile.jpg" },
      { name: "twitter:image", content: "https://img/profile.jpg" },
    ]);
  });

  it("falls back to the summary card and omits image tags when no profile image exists", () => {
    const person = {
      name: "Greta Gerwig",
      biography: "",
      profileUrl: null,
    } as PersonDetail;

    expect(personMeta(person)).toEqual([
      { title: "Greta Gerwig — Showtime" },
      {
        name: "description",
        content: "Explore the filmography of Greta Gerwig on Showtime.",
      },
      { property: "og:title", content: "Greta Gerwig — Showtime" },
      {
        property: "og:description",
        content: "Explore the filmography of Greta Gerwig on Showtime.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Greta Gerwig — Showtime" },
      {
        name: "twitter:description",
        content: "Explore the filmography of Greta Gerwig on Showtime.",
      },
    ]);
  });
});

describe("collectionMeta", () => {
  it("uses the large-image card and appends image tags when a backdrop is present", () => {
    const collection = {
      name: "The Matrix Collection",
      overview: "Every film in the franchise.",
      backdropUrl: "https://img/backdrop.jpg",
      posterUrl: "https://img/poster.jpg",
    } as CollectionDetail;

    expect(collectionMeta(collection)).toEqual([
      { title: "The Matrix Collection — Showtime" },
      { name: "description", content: "Every film in the franchise." },
      { property: "og:title", content: "The Matrix Collection — Showtime" },
      { property: "og:description", content: "Every film in the franchise." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "The Matrix Collection — Showtime" },
      { name: "twitter:description", content: "Every film in the franchise." },
      { property: "og:image", content: "https://img/backdrop.jpg" },
      { name: "twitter:image", content: "https://img/backdrop.jpg" },
    ]);
  });

  it("falls back to the summary card and omits image tags when no image exists", () => {
    const collection = {
      name: "The Matrix Collection",
      overview: "",
      backdropUrl: null,
      posterUrl: null,
    } as CollectionDetail;

    expect(collectionMeta(collection)).toEqual([
      { title: "The Matrix Collection — Showtime" },
      {
        name: "description",
        content: "Explore every movie in the The Matrix Collection on Showtime.",
      },
      { property: "og:title", content: "The Matrix Collection — Showtime" },
      {
        property: "og:description",
        content: "Explore every movie in the The Matrix Collection on Showtime.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "The Matrix Collection — Showtime" },
      {
        name: "twitter:description",
        content: "Explore every movie in the The Matrix Collection on Showtime.",
      },
    ]);
  });
});
