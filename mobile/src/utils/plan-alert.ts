type Plan = {
  status: string;
  due_date?: string | null;
  due_km?: number | null;
  current_km?: number | null;
  remind_days?: number;
  remind_km?: number;
};
const labels: Record<string, string> = {
  planned: "Chưa đến hạn",
  soon: "Sắp đến hạn",
  due: "Đến hạn",
  overdue: "Quá hạn",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};
const number = (value: number) => value.toLocaleString("vi-VN");
const dateLabel = (value: string) => value.split("-").reverse().join("/");

/** Explain each threshold separately, so a future date is never described as overdue. */
export function planAlert(
  plan: Plan,
  today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" }),
) {
  const base = labels[plan.status] || plan.status;
  if (!["soon", "due", "overdue"].includes(plan.status))
    return { label: base, details: [] as string[] };
  const criteria: {
    name: string;
    delta: number;
    reminder: number;
    unit: string;
    context: string;
  }[] = [];
  if (plan.due_date) {
    const delta =
      (Date.parse(plan.due_date + "T00:00:00Z") -
        Date.parse(today + "T00:00:00Z")) /
      86400000;
    if (Number.isFinite(delta))
      criteria.push({
        name: "ngày",
        delta,
        reminder: plan.remind_days ?? 7,
        unit: "ngày",
        context: `hạn ${dateLabel(plan.due_date)}`,
      });
  }
  if (plan.due_km != null && plan.current_km != null) {
    const delta = plan.due_km - plan.current_km;
    if (Number.isFinite(delta))
      criteria.push({
        name: "km",
        delta,
        reminder: plan.remind_km ?? 500,
        unit: "km",
        context: `hiện tại ${number(plan.current_km)} km; đến hạn ${number(plan.due_km)} km`,
      });
  }
  const causes = criteria.filter((c) =>
    plan.status === "overdue"
      ? c.delta < 0
      : plan.status === "due"
        ? c.delta === 0
        : c.delta > 0 && c.delta <= c.reminder,
  );
  let badge = causes.length
    ? `${base} theo ${causes.map((c) => c.name).join(" và ")}`
    : base;
  if (plan.status === "soon" && causes.length) {
    badge = `Sắp đến hạn: ${causes.map((c) => `còn ${number(c.delta)} ${c.unit}`).join(" / ")}`;
  } else if (plan.status === "overdue" && causes.length) {
    badge += `: ${causes.map((c) => `${c.name === "ngày" ? "trễ" : "vượt"} ${number(-c.delta)} ${c.unit}`).join(" / ")}`;
  } else if (
    plan.status === "due" &&
    causes.length === 1 &&
    causes[0].name === "ngày"
  ) {
    badge = "Đến hạn hôm nay";
  }
  return {
    label: badge,
    details: criteria.map((c) => {
      const label =
        c.delta < 0
          ? "Quá hạn"
          : c.delta === 0
            ? "Đến hạn"
            : c.delta <= c.reminder
              ? "Sắp đến hạn"
              : "Chưa đến hạn";
      const amount =
        c.delta < 0
          ? `${c.name === "ngày" ? "trễ" : "đã vượt"} ${number(-c.delta)} ${c.unit}`
          : c.delta > 0
            ? `còn ${number(c.delta)} ${c.unit}`
            : c.name === "ngày"
              ? "hôm nay"
              : "đã đạt mốc bảo dưỡng";
      return `${label} theo ${c.name}: ${amount} (${c.context}).`;
    }),
  };
}
