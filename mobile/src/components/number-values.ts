/** Accept pasted thousands groups without turning negative/decimal input into another value. */
export function normalizeIntegerInput(value: string): string {
  const text = value.trim();
  return /^\d{1,3}([., ]\d{3})+$/.test(text)
    ? text.replace(/[., ]/g, "")
    : value;
}
