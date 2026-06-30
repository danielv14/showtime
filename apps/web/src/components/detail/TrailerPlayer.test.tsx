import { describe, it, expect } from "vite-plus/test";
import { render, screen, fireEvent } from "@testing-library/react";
import { TrailerPlayer } from "./TrailerPlayer.js";

const YOUTUBE_URL = "https://www.youtube.com/watch?v=m8e-FF8MsqU";

describe("TrailerPlayer", () => {
  it("renders nothing when there is no trailer", () => {
    const { container } = render(<TrailerPlayer url={null} title="The Matrix" />);
    expect(container.innerHTML).toBe("");
  });

  it("does not embed a player on initial render (no autoplay on page load)", () => {
    render(<TrailerPlayer url={YOUTUBE_URL} title="The Matrix" />);
    expect(screen.getByRole("button", { name: /watch trailer/i })).toBeDefined();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.querySelector("iframe")).toBeNull();
  });

  it("opens an embedded player in a modal dialog when the trailer is played", () => {
    render(<TrailerPlayer url={YOUTUBE_URL} title="The Matrix" />);

    fireEvent.click(screen.getByRole("button", { name: /watch trailer/i }));

    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");

    const iframe = document.querySelector("iframe");
    expect(iframe).not.toBeNull();
    const src = iframe?.getAttribute("src") ?? "";
    expect(src).toContain("https://www.youtube.com/embed/m8e-FF8MsqU");
    expect(src).toContain("autoplay=1");
  });

  it("closes the modal with the visible close control", () => {
    render(<TrailerPlayer url={YOUTUBE_URL} title="The Matrix" />);

    fireEvent.click(screen.getByRole("button", { name: /watch trailer/i }));
    expect(screen.getByRole("dialog")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /close trailer/i }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.querySelector("iframe")).toBeNull();
  });

  it("closes the modal when Escape is pressed", () => {
    render(<TrailerPlayer url={YOUTUBE_URL} title="The Matrix" />);

    fireEvent.click(screen.getByRole("button", { name: /watch trailer/i }));
    expect(screen.getByRole("dialog")).toBeDefined();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("moves focus to the close control when the modal opens", () => {
    render(<TrailerPlayer url={YOUTUBE_URL} title="The Matrix" />);

    fireEvent.click(screen.getByRole("button", { name: /watch trailer/i }));

    const closeButton = screen.getByRole("button", { name: /close trailer/i });
    expect(document.activeElement).toBe(closeButton);
  });

  it("returns focus to the trigger when the modal closes", () => {
    render(<TrailerPlayer url={YOUTUBE_URL} title="The Matrix" />);

    const trigger = screen.getByRole("button", { name: /watch trailer/i });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: /close trailer/i }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("falls back to an external link for a non-YouTube trailer url", () => {
    render(<TrailerPlayer url="https://vimeo.com/12345" title="The Matrix" />);

    const link = screen.getByRole("link", { name: /watch trailer/i });
    expect(link.getAttribute("href")).toBe("https://vimeo.com/12345");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(screen.queryByRole("button", { name: /watch trailer/i })).toBeNull();
  });
});
