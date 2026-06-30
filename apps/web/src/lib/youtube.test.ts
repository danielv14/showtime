import { describe, it, expect } from "vite-plus/test";
import { youtubeEmbedUrl, youtubeVideoId } from "./youtube.js";

describe("youtubeVideoId", () => {
  it("reads the id from a watch URL's `v` param", () => {
    expect(youtubeVideoId("https://www.youtube.com/watch?v=m8e-FF8MsqU")).toBe("m8e-FF8MsqU");
  });

  it("reads the id from a youtu.be short link", () => {
    expect(youtubeVideoId("https://youtu.be/m8e-FF8MsqU")).toBe("m8e-FF8MsqU");
  });

  it("matches any youtube.com subdomain", () => {
    expect(youtubeVideoId("https://m.youtube.com/watch?v=abc123")).toBe("abc123");
  });

  it("returns null for a youtube URL with no video id", () => {
    expect(youtubeVideoId("https://www.youtube.com/feed/trending")).toBeNull();
    expect(youtubeVideoId("https://youtu.be/")).toBeNull();
  });

  it("returns null for a non-YouTube URL", () => {
    expect(youtubeVideoId("https://vimeo.com/12345")).toBeNull();
  });

  it("returns null for a malformed URL", () => {
    expect(youtubeVideoId("not a url")).toBeNull();
  });
});

describe("youtubeEmbedUrl", () => {
  it("builds an autoplaying, channel-scoped embed URL", () => {
    const url = youtubeEmbedUrl("m8e-FF8MsqU");
    expect(url).toContain("https://www.youtube.com/embed/m8e-FF8MsqU");
    expect(url).toContain("autoplay=1");
    expect(url).toContain("rel=0");
  });
});
