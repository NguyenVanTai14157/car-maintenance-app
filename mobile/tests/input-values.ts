import assert from "node:assert/strict";
import { dateLabel, dateValue, localDate } from "../src/components/date-values";
import { normalizeIntegerInput } from "../src/components/number-values";

for (const timezone of [
  "Asia/Bangkok",
  "America/Los_Angeles",
  "Pacific/Kiritimati",
]) {
  process.env.TZ = timezone;
  for (const day of ["2028-02-29", "2026-01-01", "2026-12-31"]) {
    assert.equal(
      localDate(dateValue(day)!),
      day,
      `Date changed in ${timezone}`,
    );
  }
}
for (const invalid of [
  "2026-02-29",
  "2026-04-31",
  "2026-13-01",
  "2026-00-10",
  "11/11/2026",
  "",
]) {
  assert.equal(dateValue(invalid), undefined);
}
assert.equal(dateLabel("2026-11-20"), "20/11/2026");
for (const input of ["650.000", "650,000", "650 000", "650000"]) {
  assert.equal(normalizeIntegerInput(input), "650000");
}
// Invalid values stay invalid so server validation can reject them.
for (const input of ["-100", "1.5", "12abc", "1,00"]) {
  assert.equal(normalizeIntegerInput(input), input);
}
console.log(
  "PASS date round trips across 3 timezones, leap days, invalid dates and integer input",
);
