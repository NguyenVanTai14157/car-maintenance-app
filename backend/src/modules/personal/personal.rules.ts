import { fail, integer, text, imageData } from "../../common/validation/input";
export const today = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
export const isoDay = (value: unknown, required = true): string | null => {
  if (!required && (value == null || value === "")) return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    fail("Nhập ngày theo YYYY-MM-DD.");
  const date = new Date(value + "T00:00:00Z");
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  )
    fail("Ngày không tồn tại.");
  return value;
};
export const optionalInt = (
  v: unknown,
  label: string,
  min = 0,
  max = 1000000000,
): number | null =>
  v == null || v === "" ? null : integer(v, label, min, max);
export const bool = (v: unknown, label: string) => {
  if (typeof v !== "boolean") fail(label + " không hợp lệ.");
  return v as boolean;
};
export const attachments = (v: any): string[] => {
  if (v == null) return [];
  if (!Array.isArray(v) || v.length > 10) fail("Nhóm ảnh không hợp lệ.");
  return [...new Set(v.map(imageData))] as string[];
};
export function vehicleInput(b: any) {
  const plate = text(b.plate, "Biển số", 20, false)
    .replace(/[\s.-]/g, "")
    .toUpperCase();
  if (plate && !/^[A-Z0-9]{5,15}$/.test(plate)) fail("Biển số không hợp lệ.");
  return {
    brand: text(b.brand, "Hãng xe", 80),
    model: text(b.model, "Dòng xe", 80),
    plate: plate || null,
    year: optionalInt(
      b.year,
      "Năm sản xuất",
      1950,
      new Date().getFullYear() + 1,
    ),
    odometer: integer(b.odometer, "Số km", 0, 10000000),
    image: b.image ? imageData(b.image) : "",
    notes: text(b.notes, "Ghi chú", 2000, false),
  };
}
export function planInput(b: any) {
  const due_date = isoDay(b.due_date, false),
    due_km = optionalInt(b.due_km, "Km đến hạn", 0, 10000000);
  if (!due_date && due_km == null) fail("Cần ngày dự kiến hoặc số km đến hạn.");
  return {
    vehicle_id: integer(b.vehicle_id, "Xe", 1),
    category_id: integer(b.category_id, "Hạng mục", 1),
    due_date,
    due_km,
    remind_days: integer(b.remind_days ?? 7, "Nhắc trước theo ngày", 0, 365),
    remind_km: integer(b.remind_km ?? 500, "Nhắc trước theo km", 0, 100000),
    interval_months: optionalInt(b.interval_months, "Chu kỳ tháng", 1, 120),
    interval_km: optionalInt(b.interval_km, "Chu kỳ km", 1, 1000000),
    notes: text(b.notes, "Ghi chú", 2000, false),
  };
}
export function recordInput(b: any) {
  const performed_date = isoDay(b.performed_date)!;
  if (performed_date > today()) fail("Ngày thực hiện không được ở tương lai.");
  return {
    vehicle_id: integer(b.vehicle_id, "Xe", 1),
    category_id: integer(b.category_id, "Hạng mục", 1),
    performed_date,
    odometer: integer(b.odometer, "Số km thực hiện", 0, 10000000),
    cost: integer(b.cost, "Chi phí", 0, 1000000000),
    content: text(b.content, "Nội dung bảo dưỡng", 2000),
    notes: text(b.notes, "Ghi chú", 2000, false),
    images: attachments(b.images),
    interval_months: optionalInt(b.interval_months, "Chu kỳ tháng", 1, 120),
    interval_km: optionalInt(b.interval_km, "Chu kỳ km", 1, 1000000),
  };
}
export function planStatus(p: any, day = today()) {
  if (p.completed_record_id) return { status: "completed", reasons: [] };
  if (p.cancelled) return { status: "cancelled", reasons: [] };
  const reasons: string[] = [],
    over: string[] = [],
    soon: string[] = [];
  if (p.due_date) {
    const delta =
      (Date.parse(p.due_date + "T00:00Z") - Date.parse(day + "T00:00Z")) /
      86400000;
    if (delta < 0) {
      over.push("date");
      reasons.push("date");
    } else if (delta === 0) reasons.push("date");
    else if (delta <= p.remind_days) soon.push("date");
  }
  if (p.due_km != null) {
    const delta = p.due_km - p.current_km;
    if (delta < 0) {
      over.push("km");
      reasons.push("km");
    } else if (delta === 0) reasons.push("km");
    else if (delta <= p.remind_km) soon.push("km");
  }
  return {
    status: over.length
      ? "overdue"
      : reasons.length
        ? "due"
        : soon.length
          ? "soon"
          : "planned",
    reasons: reasons.length ? reasons : soon,
  };
}
export function nextSuggestion(record: any) {
  let date: string | null = null;
  if (record.interval_months) {
    const [y, m, d] = record.performed_date.split("-").map(Number),
      first = new Date(Date.UTC(y, m - 1 + record.interval_months, 1));
    const last = new Date(
      Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
    ).getUTCDate();
    first.setUTCDate(Math.min(d, last));
    date = first.toISOString().slice(0, 10);
  }
  return {
    due_date: date,
    due_km: record.interval_km ? record.odometer + record.interval_km : null,
  };
}
