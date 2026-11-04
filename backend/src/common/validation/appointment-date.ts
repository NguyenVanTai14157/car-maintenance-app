import { fail } from "./input";
/** Require a real ISO calendar date with an explicit offset; Date alone normalizes Feb 30. */
export function appointmentDate(value: unknown): Date {
  // PostgreSQL supplies already validated timestamps as Date for accepted proposals.
  if (value instanceof Date && Number.isFinite(value.getTime()))
    return new Date(value);
  const match =
    typeof value === "string"
      ? /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.exec(
          value,
        )
      : null;
  if (!match) fail("Ngày giờ không hợp lệ. Vui lòng chọn lại.");
  const [, year, month, day, hour, minute, second] = match;
  const calendar = new Date(0);
  calendar.setUTCFullYear(Number(year), Number(month) - 1, Number(day));
  if (
    calendar.getUTCFullYear() !== Number(year) ||
    calendar.getUTCMonth() !== Number(month) - 1 ||
    calendar.getUTCDate() !== Number(day) ||
    Number(hour) > 23 ||
    Number(minute) > 59 ||
    Number(second || 0) > 59
  )
    fail("Ngày giờ không tồn tại. Vui lòng chọn lại.");
  const date = new Date(value as string);
  if (!Number.isFinite(date.getTime())) fail("Ngày giờ không hợp lệ.");
  return date;
}
