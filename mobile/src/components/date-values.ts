export type DateFieldProps = {
  label: string;
  value: string | null | undefined;
  onChange: (value: string) => void;
  minimum?: string;
  maximum?: string;
  clearable?: boolean;
  hint?: string;
};
export function dateValue(value?: string | null): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);
  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
    ? date
    : undefined;
}
export function localDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function dateLabel(value: string): string {
  return value.split("-").reverse().join("/");
}
