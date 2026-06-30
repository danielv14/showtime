import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { EpisodeDetail, EpisodeRatingsData, EpisodeRatingsResult } from "#/server/media";

// The on-demand episode fetch now runs through `useQuery`, so the component
// needs a `QueryClient` in context. A fresh client per render keeps tests
// isolated, and `retry: false` lets the error case fail fast instead of
// running React Query's default retries.
const renderWithClient = (ui: ReactNode) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

// `#/server/media` reaches into `cloudflare:workers` (via the cache), which
// can't load under jsdom, and we want to drive the on-demand episode fetch
// ourselves. Mock the module down to the one function the component calls.
const getEpisodeDetail = vi.fn();
vi.mock("#/server/media", () => ({
  getEpisodeDetail: (...args: unknown[]) => getEpisodeDetail(...args),
}));

// `SeasonEpisodes` wraps `SeasonEpisodesContent` in `Await` for SSR streaming.
// We exercise the content view directly with an already-resolved result so the
// assertions stay synchronous and don't depend on Suspense resolution.
const { SeasonEpisodesContent } = await import("./SeasonEpisodes.js");

const TV_ID = 1396;

const ratingsData: EpisodeRatingsData = {
  maxEpisodes: 2,
  seasons: [
    {
      season: 1,
      average: 8.5,
      episodes: [
        { episode: 1, title: "Pilot", rating: 8.4, airDate: "20 Jan 2008" },
        { episode: 2, title: "Cat's in the Bag…", rating: null, airDate: "27 Jan 2008" },
      ],
    },
    {
      season: 2,
      average: 9.1,
      episodes: [{ episode: 1, title: "Seven Thirty-Seven", rating: 9.2, airDate: "08 Mar 2009" }],
    },
  ],
};

const ready = (data: EpisodeRatingsData): EpisodeRatingsResult => ({ status: "ready", data });

const episodeDetail = (overrides: Partial<EpisodeDetail> = {}): EpisodeDetail => ({
  season: 1,
  episode: 1,
  title: "Pilot",
  airDate: "2008-01-20",
  rating: 8.4,
  plot: "A high school chemistry teacher turns to cooking meth.",
  cast: ["Bryan Cranston", "Aaron Paul"],
  ...overrides,
});

describe("SeasonEpisodes", () => {
  beforeEach(() => {
    getEpisodeDetail.mockReset();
  });

  it("lists the first season's episodes from the streamed data, with number, title, air date and rating", () => {
    renderWithClient(<SeasonEpisodesContent result={ready(ratingsData)} tvId={TV_ID} />);

    const row = screen.getByText("Pilot").closest("li");
    expect(row).not.toBeNull();
    const inRow = within(row as HTMLElement);
    expect(inRow.getByText("1")).toBeTruthy();
    expect(inRow.getByText(/Jan/)).toBeTruthy();
    expect(inRow.getByText("8.4")).toBeTruthy();

    // Listing the episodes must not have triggered any per-episode fetch.
    expect(getEpisodeDetail).not.toHaveBeenCalled();
  });

  it("shows 'Not rated' for an episode IMDb has no score for", () => {
    renderWithClient(<SeasonEpisodesContent result={ready(ratingsData)} tvId={TV_ID} />);
    expect(screen.getByText("Not rated")).toBeTruthy();
  });

  it("switches the listed episodes when another season is picked", () => {
    renderWithClient(<SeasonEpisodesContent result={ready(ratingsData)} tvId={TV_ID} />);

    fireEvent.click(screen.getByRole("tab", { name: "Season 2" }));

    expect(screen.getByText("Seven Thirty-Seven")).toBeTruthy();
    expect(screen.queryByText("Pilot")).toBeNull();
  });

  it("fetches and shows plot and guest stars (by TMDB id) when an episode is opened", async () => {
    getEpisodeDetail.mockResolvedValue(episodeDetail());
    renderWithClient(<SeasonEpisodesContent result={ready(ratingsData)} tvId={TV_ID} />);

    fireEvent.click(screen.getByText("Pilot"));

    expect(
      await screen.findByText("A high school chemistry teacher turns to cooking meth."),
    ).toBeTruthy();
    expect(screen.getByText("Bryan Cranston, Aaron Paul")).toBeTruthy();
    expect(getEpisodeDetail).toHaveBeenCalledWith({
      data: { tvId: TV_ID, season: 1, episode: 1 },
    });
  });

  it("serves a reopened episode from cache instead of refetching", async () => {
    getEpisodeDetail.mockResolvedValue(episodeDetail());
    renderWithClient(<SeasonEpisodesContent result={ready(ratingsData)} tvId={TV_ID} />);

    // Open, wait for the detail to resolve, then close the row.
    fireEvent.click(screen.getByText("Pilot"));
    await screen.findByText("A high school chemistry teacher turns to cooking meth.");
    fireEvent.click(screen.getByText("Pilot"));
    await waitFor(() =>
      expect(
        screen.queryByText("A high school chemistry teacher turns to cooking meth."),
      ).toBeNull(),
    );

    // Reopening shows the cached detail without a second fetch.
    fireEvent.click(screen.getByText("Pilot"));
    expect(
      await screen.findByText("A high school chemistry teacher turns to cooking meth."),
    ).toBeTruthy();
    expect(getEpisodeDetail).toHaveBeenCalledTimes(1);
  });

  it("shows a loading state while the episode detail is in flight", async () => {
    let resolve: (detail: EpisodeDetail) => void = () => {};
    getEpisodeDetail.mockReturnValue(
      new Promise<EpisodeDetail>((r) => {
        resolve = r;
      }),
    );
    renderWithClient(<SeasonEpisodesContent result={ready(ratingsData)} tvId={TV_ID} />);

    fireEvent.click(screen.getByText("Pilot"));
    expect(await screen.findByText(/Loading episode details/)).toBeTruthy();

    resolve(episodeDetail());
    await waitFor(() => expect(screen.queryByText(/Loading episode details/)).toBeNull());
  });

  it("shows an error state when the episode detail fetch fails", async () => {
    getEpisodeDetail.mockRejectedValue(new Error("network"));
    renderWithClient(<SeasonEpisodesContent result={ready(ratingsData)} tvId={TV_ID} />);

    fireEvent.click(screen.getByText("Pilot"));
    expect(await screen.findByText(/Episode details are temporarily unavailable/)).toBeTruthy();
  });

  it("renders without breaking when there is no season data", () => {
    renderWithClient(
      <SeasonEpisodesContent result={ready({ seasons: [], maxEpisodes: 0 })} tvId={TV_ID} />,
    );
    expect(screen.getByText(/No season data available/)).toBeTruthy();
  });

  it("shows a visible 'temporarily unavailable' message when the ratings fetch failed", () => {
    renderWithClient(<SeasonEpisodesContent result={{ status: "unavailable" }} tvId={TV_ID} />);
    expect(screen.getByText(/Episode data is temporarily unavailable/)).toBeTruthy();
    expect(screen.queryByText(/No season data available/)).toBeNull();
  });

  it("defaults to the first available season even when season numbering is irregular", () => {
    const gapData: EpisodeRatingsData = {
      maxEpisodes: 1,
      seasons: [
        {
          season: 3,
          average: 7.0,
          episodes: [{ episode: 1, title: "Late Start", rating: 7.0, airDate: "01 Jan 2012" }],
        },
      ],
    };
    renderWithClient(<SeasonEpisodesContent result={ready(gapData)} tvId={TV_ID} />);

    expect(screen.getByText("Late Start")).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Season 3", selected: true })).toBeTruthy();
  });
});
