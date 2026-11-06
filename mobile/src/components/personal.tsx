import { Text } from "react-native";
import { Badge, Body, Button, Card, Chips, ErrorText, go, Heading } from "./ui";
export const day = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
export const dayLabel = (value: string | null) =>
  value ? value.split("-").reverse().join("/") : "Chưa đặt";
export function reason(plan: any) {
  return (plan.reasons || [])
    .map((r: string) =>
      r === "date"
        ? `Theo ngày ${dayLabel(plan.due_date)}`
        : `Theo km: ${Number(plan.current_km).toLocaleString("vi-VN")} / ${Number(plan.due_km).toLocaleString("vi-VN")} km`,
    )
    .join(" · ");
}
export function PlanCard({ plan }: { plan: any }) {
  return (
    <Card>
      <Badge status={plan.status} />
      <Heading>{plan.category_name}</Heading>
      <Body>{plan.plate || `${plan.brand} ${plan.model}`}</Body>
      <Body>
        Ngày: {dayLabel(plan.due_date)} · Km đến hạn:{" "}
        {plan.due_km == null ? "Chưa đặt" : plan.due_km.toLocaleString("vi-VN")}
      </Body>
      {!!reason(plan) && <Body>{reason(plan)}</Body>}
      <Button
        title="Xem kế hoạch"
        secondary
        onPress={() => go("/plan?id=" + plan.id)}
      />
    </Card>
  );
}
export function Select({
  label,
  value,
  onChange,
  items,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  items: { id: number; name: string }[];
}) {
  return (
    <>
      <Text style={{ fontWeight: "700", color: "#173F35", marginVertical: 8 }}>
        {label}
      </Text>
      <Chips
        value={value}
        onChange={onChange}
        options={items.map((item) => ({ label: item.name, value: item.id }))}
      />
    </>
  );
}
export function Loading({ error }: { error?: string }) {
  return (
    <>
      <Body>Đang tải dữ liệu…</Body>
      <ErrorText text={error} />
    </>
  );
}
