import { integer, text, fail } from "../../common/validation/input";
import type { PageQuery } from "./dto/input.dto";
export function pageInput(q: PageQuery) {
  const page = integer(q.page ?? 1, "Trang", 1, 100000),
    page_size = integer(q.page_size ?? 20, "Số dòng", 1, 100);
  return {
    page,
    page_size,
    offset: (page - 1) * page_size,
    q: text(q.q, "Từ khóa", 100, false),
  };
}
export function queryBool(value: any, label: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  fail(label + " phải là true hoặc false.");
}
export function onlyFields(body: any, allowed: string[]) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    fail("Nội dung yêu cầu không hợp lệ.");
  if (Object.keys(body).some((k) => !allowed.includes(k)))
    fail("Yêu cầu chứa trường không được phép.");
  if (!Object.keys(body).length) fail("Chưa có thông tin cần cập nhật.");
}
export const searchPattern = (q: string) =>
  "%" + q.replace(/[\\%_]/g, "\\$&") + "%";
