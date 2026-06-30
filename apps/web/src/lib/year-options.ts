/**
 * Build the year dropdown options for a filter form: a leading "Any year"
 * (empty value) followed by every year from `max` down to `min`, newest first.
 * Shared by the browse and search filter forms, which both offer a year filter.
 * The returned shape is structurally a `SelectOption`, kept dependency-free here
 * so this stays a plain, unit-testable helper.
 */
export const buildYearOptions = (range: {
  min: number;
  max: number;
}): { value: string; label: string }[] => {
  const options = [{ value: "", label: "Any year" }];
  for (let year = range.max; year >= range.min; year--) {
    options.push({ value: String(year), label: String(year) });
  }
  return options;
};
