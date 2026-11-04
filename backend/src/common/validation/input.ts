import { BadRequestException, ForbiddenException } from "@nestjs/common";
export function fail(message: string): never {
  throw new BadRequestException(message);
}
export function allow(user: any, roles: string[]) {
  if (!roles.includes(user.role))
    throw new ForbiddenException("Bạn không có quyền thực hiện thao tác này.");
}
export function text(
  value: any,
  label: string,
  max = 500,
  required = true,
): string {
  const s = typeof value === "string" ? value.trim() : "";
  if (required && !s) fail(`Vui lòng nhập ${label.toLowerCase()}.`);
  if (s.length > max) fail(`${label} quá dài. Vui lòng nhập ngắn gọn hơn.`);
  return s;
}
export function integer(
  value: any,
  label: string,
  min = 0,
  max = 1000000000,
): number {
  const n = Number(value);
  if (
    (typeof value !== "number" && typeof value !== "string") ||
    (typeof value === "string" && !/^-?\d+$/.test(value.trim())) ||
    value === "" ||
    value == null ||
    !Number.isSafeInteger(n) ||
    n < min ||
    n > max
  )
    fail(`${label} không hợp lệ.`);
  return n;
}
export function password(value: any): string {
  if (typeof value !== "string" || value.length < 8)
    fail("Mật khẩu cần ít nhất 8 ký tự.");
  if (Buffer.byteLength(value) > 72) fail("Mật khẩu quá dài.");
  return value;
}
export function contact(body: any) {
  const email = text(body.email, "Email", 254, false).toLowerCase() || null;
  const phone =
    text(body.phone, "Số điện thoại", 20, false).replace(/[\s.-]/g, "") || null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    fail("Email không hợp lệ.");
  if (phone && !/^\+?[0-9]{9,15}$/.test(phone))
    fail("Số điện thoại không hợp lệ.");
  if (!email && !phone) fail("Cần email hoặc số điện thoại.");
  return { email, phone };
}
export function imageData(value: any) {
  if (
    typeof value !== "string" ||
    value.length > 2800000 ||
    !/^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(value)
  )
    fail("Ảnh phải là JPEG/PNG và nhỏ hơn 2 MB.");
  return value;
}
export function publicUser(u: any) {
  const { password_hash, ...safe } = u;
  return safe;
}
