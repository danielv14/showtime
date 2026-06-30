import { describe, it, expect } from "vite-plus/test";
import { buildYearOptions } from "./year-options.js";

describe("buildYearOptions", () => {
  it("leads with an 'Any year' option carrying an empty value", () => {
    expect(buildYearOptions({ min: 2020, max: 2022 })[0]).toEqual({ value: "", label: "Any year" });
  });

  it("lists every year from max down to min, newest first", () => {
    const years = buildYearOptions({ min: 2020, max: 2022 })
      .slice(1)
      .map((option) => option.value);
    expect(years).toEqual(["2022", "2021", "2020"]);
  });

  it("includes one option per year plus the 'Any year' entry", () => {
    expect(buildYearOptions({ min: 1990, max: 2000 })).toHaveLength(12);
  });

  it("handles a single-year range", () => {
    expect(buildYearOptions({ min: 2021, max: 2021 }).slice(1)).toEqual([
      { value: "2021", label: "2021" },
    ]);
  });
});
