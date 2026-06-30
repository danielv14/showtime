import { describe, it, expect } from "vite-plus/test";
import { formatAirDate, formatDate, lifespan } from "./date.js";

describe("formatDate", () => {
  it("formats a YYYY-MM-DD date as a readable en-US string", () => {
    expect(formatDate("1999-03-31")).toBe("March 31, 1999");
  });

  it("renders the same day regardless of timezone (pinned to UTC)", () => {
    expect(formatDate("2020-01-01")).toBe("January 1, 2020");
  });

  it("returns null for a missing value", () => {
    expect(formatDate(null)).toBeNull();
    expect(formatDate("")).toBeNull();
  });

  it("passes an unparseable value through unchanged", () => {
    expect(formatDate("sometime in 1999")).toBe("sometime in 1999");
  });
});

describe("lifespan", () => {
  it("joins birth and death dates with an en dash", () => {
    expect(lifespan("1899-04-23", "1977-07-02")).toBe("April 23, 1899 — July 2, 1977");
  });

  it("shows only the birth date when there is no death date", () => {
    expect(lifespan("1980-12-01", null)).toBe("December 1, 1980");
  });

  it("prefixes 'Died' when only the death date is known", () => {
    expect(lifespan(null, "1977-07-02")).toBe("Died July 2, 1977");
  });

  it("returns null when neither date is known", () => {
    expect(lifespan(null, null)).toBeNull();
  });
});

describe("formatAirDate", () => {
  it("formats an OMDB 'DD Mon YYYY' air date", () => {
    expect(formatAirDate("20 Jan 2008")).toMatch(/2008/);
  });

  it("passes an unparseable air date through unchanged", () => {
    expect(formatAirDate("TBA")).toBe("TBA");
  });
});
