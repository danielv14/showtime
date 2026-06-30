/** The inclusive year span a filter form offers, oldest (`min`) to newest (`max`). */
export type YearRange = { min: number; max: number };

/**
 * The year range a browse/search surface offers right now: from `floor` up to
 * next year, so a title slated for release early next year is still selectable.
 * Each route differs only in its floor, so that is the single parameter.
 */
export const currentYearRange = (floor: number): YearRange => ({
  min: floor,
  max: new Date().getFullYear() + 1,
});

/**
 * Build the year dropdown options for a filter form: a leading "Any year"
 * (empty value) followed by every year from `max` down to `min`, newest first.
 * Shared by the browse and search filter forms, which both offer a year filter.
 * The returned shape is structurally a `SelectOption`, kept dependency-free here
 * so this stays a plain, unit-testable helper.
 */
export const buildYearOptions = (range: YearRange): { value: string; label: string }[] => {
  const options = [{ value: "", label: "Any year" }];
  for (let year = range.max; year >= range.min; year--) {
    options.push({ value: String(year), label: String(year) });
  }
  return options;
};
