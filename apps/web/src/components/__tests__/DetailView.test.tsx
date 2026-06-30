import { describe, it, expect } from "vite-plus/test";
import { screen } from "@testing-library/react";
import { DetailView } from "../DetailView.js";
import type { MediaDetail } from "../../server/media.js";
import { renderWithRouter } from "../../test-utils.js";

const detail = (overrides: Partial<MediaDetail>): MediaDetail => ({
  id: 603,
  mediaType: "movie",
  title: "The Matrix",
  tagline: "",
  year: "1999",
  overview: "",
  runtime: null,
  genres: [
    { id: 28, name: "Action" },
    { id: 878, name: "Science Fiction" },
  ],
  posterUrl: null,
  backdropUrl: null,
  tmdbRating: 8,
  tmdbVotes: 100,
  status: "Released",
  cast: [],
  directors: [],
  writers: [],
  trailerUrl: null,
  whereToWatch: null,
  ratings: [],
  awards: null,
  similar: [],
  reviews: [],
  ...overrides,
});

describe("DetailView genre tags", () => {
  it("renders each genre as a link into the movies browse view, filtered to that genre", async () => {
    await renderWithRouter(<DetailView detail={detail({})} />);

    const action = screen.getByRole("link", { name: "Action" });
    const href = action.getAttribute("href") ?? "";
    expect(href).toContain("/movies");
    expect(href).toContain("genre=28");
  });

  it("links TV genres into the shows browse view", async () => {
    await renderWithRouter(
      <DetailView detail={detail({ mediaType: "tv", genres: [{ id: 18, name: "Drama" }] })} />,
    );

    const drama = screen.getByRole("link", { name: "Drama" });
    const href = drama.getAttribute("href") ?? "";
    expect(href).toContain("/shows");
    expect(href).toContain("genre=18");
  });
});

describe("DetailView collection entry", () => {
  it("links to the collection page when the movie belongs to one", async () => {
    await renderWithRouter(
      <DetailView detail={detail({ collection: { id: 2344, name: "The Matrix Collection" } })} />,
    );

    const link = screen.getByRole("link", { name: /Part of The Matrix Collection/ });
    const href = link.getAttribute("href") ?? "";
    expect(href).toContain("/collection/the-matrix-collection-2344");
  });

  it("renders no collection entry for a standalone movie", async () => {
    await renderWithRouter(<DetailView detail={detail({ collection: null })} />);
    expect(screen.queryByText(/Part of/)).toBeNull();
  });
});
