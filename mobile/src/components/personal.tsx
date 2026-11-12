import { Text } from "react-native";
import { Badge, Body, Button, Card, Chips, ErrorText, go, Heading } from "./ui";
import { planAlert } from "../utils/plan-alert";
export const day = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
export const dayLabel = (value: string | null) =>
  value ? value.split("-").reverse().join("/") : "Chưa đặt";
export function VehicleSummary({ vehicle }: { vehicle: any }) {
  return (
    <>
      <Body>Hãng xe: {vehicle.brand || "Chưa cung cấp"}</Body>
      <Body>Dòng xe: {vehicle.model || "Chưa cung cấp"}</Body>
      <Body>Biển số: {vehicle.plate || "Chưa cung cấp"}</Body>
    </>
  );
}
export function VehicleIdentifier({ vehicle }: { vehicle: any }) {
  return (
    <>
      <Body>Biển số: {vehicle.plate || "Chưa cung cấp"}</Body>
      <Body>
        Xe: {[vehicle.brand, vehicle.model].filter(Boolean).join(" ") || "Chưa cung cấp"}
      </Body>
    </>
  );
}
export function PlanSummary({ plan }: { plan: any }) {
  const alert = planAlert(plan);
  return (
    <>
      <Badge status={plan.status} label={alert.label} />
      <Heading>{plan.category_name}</Heading>
      <VehicleSummary vehicle={plan} />
      <Body>Ngày: {dayLabel(plan.due_date)}</Body>
      <Body>
        Km đến hạn:{" "}
        {plan.due_km == null
          ? "Chưa đặt"
          : `${plan.due_km.toLocaleString("vi-VN")} km`}
      </Body>
      {alert.details.map((detail) => (
        <Body key={detail}>{detail}</Body>
      ))}
    </>
  );
}
export function PlanCard({
  plan,
  compact = false,
}: {
  plan: any;
  compact?: boolean;
}) {
  return (
    <Card>
      {compact ? (
        <>
          <Badge status={plan.status} label={planAlert(plan).label} />
          <Heading>{plan.category_name}</Heading>
          <VehicleIdentifier vehicle={plan} />
        </>
      ) : (
        <PlanSummary plan={plan} />
      )}
      <Button
        title="Xem chi tiết lịch"
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
