import { describe, it, expect } from "vite-plus/test";
import { screen, within } from "@testing-library/react";
import { BrowseView } from "../BrowseView.js";
import type { BrowseFilters, GenreOption } from "../../server/browse.js";
import type { MediaItem } from "../../server/media.js";
import { renderWithRouter } from "../../test-utils.js";

const GENRES: GenreOption[] = [
  { id: 28, name: "Action" },
  { id: 35, name: "Comedy" },
];

const FILTERS: BrowseFilters = {
  genre: 28,
  minRating: 7,
  year: 2023,
  sort: "rating",
  page: 1,
};

const item = (overrides: Partial<MediaItem>): MediaItem => ({
  id: 1,
  mediaType: "movie",
  title: "Untitled",
  year: "2023",
  rating: 8,
  posterUrl: "https://image.tmdb.org/t/p/w342/p.jpg",
  backdropUrl: null,
  overview: "",
  ...overrides,
});

const yearRange = { min: 1950, max: 2027 };

describe("BrowseView", () => {
  it("renders the grid with a detail link per result", async () => {
    await renderWithRouter(
      <BrowseView
        to="/movies"
        heading="Movies"
        items={[item({ id: 603, title: "The Matrix" })]}
        page={1}
        totalPages={5}
        filters={FILTERS}
        genres={GENRES}
        yearRange={yearRange}
      />,
    );

    const link = screen.getByRole("link", { name: /The Matrix/ });
    expect(link.getAttribute("href")).toContain("/movie/the-matrix-603");
  });

  it("reflects the active selections in the filter controls", async () => {
    await renderWithRouter(
      <BrowseView
        to="/movies"
        heading="Movies"
        items={[item({})]}
        page={1}
        totalPages={1}
        filters={FILTERS}
        genres={GENRES}
        yearRange={yearRange}
      />,
    );

    const value = (name: string) =>
      (screen.getByRole("combobox", { name }) as unknown as HTMLSelectElement).value;
    expect(value("Genre")).toBe("28");
    expect(value("Min rating")).toBe("7");
    expect(value("Year")).toBe("2023");
    expect(value("Sort by")).toBe("rating");
  });

  it("shows an empty state when there are no results", async () => {
    await renderWithRouter(
      <BrowseView
        to="/movies"
        heading="Movies"
        items={[]}
        page={1}
        totalPages={0}
        filters={FILTERS}
        genres={GENRES}
        yearRange={yearRange}
      />,
    );

    expect(screen.getByText(/No titles match these filters/)).toBeTruthy();
    // No pagination is rendered when there is nothing to page through.
    expect(screen.queryByRole("navigation", { name: "Pagination" })).toBeNull();
  });

  it("renders pagination that stops cleanly at the last page", async () => {
    await renderWithRouter(
      <BrowseView
        to="/movies"
        heading="Movies"
        items={[item({})]}
        page={5}
        totalPages={5}
        filters={FILTERS}
        genres={GENRES}
        yearRange={yearRange}
      />,
    );

    const nav = screen.getByRole("navigation", { name: "Pagination" });
    // On the last page, "Previous" is a real link and "Next" is an inert span.
    expect(within(nav).getByRole("link", { name: /Previous/ })).toBeTruthy();
    expect(within(nav).queryByRole("link", { name: /Next/ })).toBeNull();
    expect(within(nav).getByText("Page 5 of 5")).toBeTruthy();
  });
});
