import { describe, it, expect } from "vite-plus/test";
import { fireEvent, render, screen } from "@testing-library/react";
import { Reviews } from "../Reviews.js";
import type { Review } from "../../server/media.js";

const review = (overrides: Partial<Review>): Review => ({
  id: "r1",
  author: "Roger",
  rating: null,
  content: "A short, punchy take.",
  url: "https://www.themoviedb.org/review/r1",
  ...overrides,
});

const longContent = "x".repeat(400);

describe("Reviews", () => {
  it("renders nothing when there are no reviews", () => {
    const { container } = render(<Reviews reviews={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when reviews is undefined (e.g. a stale cached detail)", () => {
    const { container } = render(<Reviews reviews={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows the author and content of each review", () => {
    render(<Reviews reviews={[review({ author: "Ebert", content: "Loved it." })]} />);

    expect(screen.getByText("Ebert")).toBeDefined();
    expect(screen.getByText("Loved it.")).toBeDefined();
  });

  it("renders the rating when present and omits it when null", () => {
    const { rerender } = render(<Reviews reviews={[review({ rating: 8 })]} />);
    expect(screen.getByText("8.0")).toBeDefined();

    rerender(<Reviews reviews={[review({ rating: null })]} />);
    expect(screen.queryByText("8.0")).toBeNull();
  });

  it("truncates long content until expanded, then collapses again", () => {
    render(<Reviews reviews={[review({ content: longContent })]} />);

    // Truncated: the full text is not present, and a Read more toggle is shown.
    expect(screen.queryByText(longContent)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Read more" }));

    // Expanded: the full text is now present and the toggle flips to Show less.
    expect(screen.getByText(longContent)).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Show less" }));

    expect(screen.queryByText(longContent)).toBeNull();
    expect(screen.getByRole("button", { name: "Read more" })).toBeDefined();
  });

  it("does not offer a toggle for short content", () => {
    render(<Reviews reviews={[review({ content: "Brief." })]} />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("links each review to its TMDB page", () => {
    render(<Reviews reviews={[review({ url: "https://www.themoviedb.org/review/abc" })]} />);
    const link = screen.getByRole("link", { name: /TMDB/ });
    expect(link.getAttribute("href")).toBe("https://www.themoviedb.org/review/abc");
  });
});
