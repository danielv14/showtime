import { describe, it, expect } from "vite-plus/test";
import { screen, within } from "@testing-library/react";
import { SearchView } from "./SearchView.js";
import type { SearchFilters } from "#/server/search";
import type { MediaItem, PersonItem } from "#/server/media";
import { renderWithRouter } from "#/test-utils";

const mediaItem = (overrides: Partial<MediaItem>): MediaItem => ({
  id: 1,
  mediaType: "movie",
  title: "Untitled",
  year: "1999",
  rating: 8,
  posterUrl: "https://image.tmdb.org/t/p/w342/p.jpg",
  backdropUrl: null,
  overview: "",
  ...overrides,
});

const personItem = (overrides: Partial<PersonItem>): PersonItem => ({
  id: 100,
  mediaType: "person",
  name: "Unknown",
  department: "Acting",
  profileUrl: null,
  knownFor: [],
  ...overrides,
});

const filters = (overrides: Partial<SearchFilters> = {}): SearchFilters => ({
  query: "matrix",
  type: "all",
  year: null,
  page: 1,
  ...overrides,
});

const yearRange = { min: 1950, max: 2027 };

describe("SearchView", () => {
  it("reflects the active type and year in the filter controls", async () => {
    const { container } = await renderWithRouter(
      <SearchView
        query="matrix"
        results={[mediaItem({})]}
        page={1}
        totalPages={1}
        filters={filters({ type: "movie", year: 1999 })}
        yearRange={yearRange}
      />,
    );

    // Each `Select` submits its value through a hidden input under its `name`,
    // which is what the GET form turns into the shareable URL params.
    const value = (name: string) =>
      container.querySelector<HTMLInputElement>(`input[name="${name}"]`)?.value;
    expect(value("type")).toBe("movie");
    expect(value("year")).toBe("1999");
  });

  it("hides the year control for the blended 'all' search", async () => {
    const { container } = await renderWithRouter(
      <SearchView
        query="matrix"
        results={[mediaItem({})]}
        page={1}
        totalPages={1}
        filters={filters({ type: "all" })}
        yearRange={yearRange}
      />,
    );

    expect(container.querySelector('input[name="type"]')).toBeTruthy();
    expect(container.querySelector('input[name="year"]')).toBeNull();
  });

  it("renders only the media grid when narrowed to movies", async () => {
    await renderWithRouter(
      <SearchView
        query="matrix"
        results={[mediaItem({ id: 603, title: "The Matrix" })]}
        page={1}
        totalPages={1}
        filters={filters({ type: "movie" })}
        yearRange={yearRange}
      />,
    );

    expect(screen.getByRole("link", { name: /The Matrix/ }).getAttribute("href")).toContain(
      "/movie/the-matrix-603",
    );
    expect(screen.queryByRole("heading", { name: "People" })).toBeNull();
  });

  it("renders only the people section when narrowed to people", async () => {
    await renderWithRouter(
      <SearchView
        query="pitt"
        results={[personItem({ id: 287, name: "Brad Pitt" })]}
        page={1}
        totalPages={1}
        filters={filters({ query: "pitt", type: "person" })}
        yearRange={yearRange}
      />,
    );

    expect(screen.getByRole("heading", { name: "People" })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Brad Pitt/ })).toBeTruthy();
  });

  it("shows an empty state and no pagination when nothing matches", async () => {
    await renderWithRouter(
      <SearchView
        query="zzzz"
        results={[]}
        page={1}
        totalPages={0}
        filters={filters({ query: "zzzz" })}
        yearRange={yearRange}
      />,
    );

    expect(screen.getByText(/No results match your search/)).toBeTruthy();
    expect(screen.queryByRole("navigation", { name: "Pagination" })).toBeNull();
  });

  it("renders pagination that stops cleanly at the last page", async () => {
    await renderWithRouter(
      <SearchView
        query="matrix"
        results={[mediaItem({})]}
        page={5}
        totalPages={5}
        filters={filters({ type: "movie", page: 5 })}
        yearRange={yearRange}
      />,
    );

    const nav = screen.getByRole("navigation", { name: "Pagination" });
    expect(within(nav).getByRole("link", { name: /Previous/ })).toBeTruthy();
    expect(within(nav).queryByRole("link", { name: /Next/ })).toBeNull();
    expect(within(nav).getByText("Page 5 of 5")).toBeTruthy();
  });

  it("prompts to search instead of running an empty query", async () => {
    const { container } = await renderWithRouter(
      <SearchView
        query=""
        results={[]}
        page={1}
        totalPages={0}
        filters={filters({ query: "" })}
        yearRange={yearRange}
      />,
    );

    expect(screen.getByText("Search for a movie, show, or person.")).toBeTruthy();
    // With no query there is nothing to filter, so the controls are not shown.
    expect(container.querySelector('input[name="type"]')).toBeNull();
  });
});
