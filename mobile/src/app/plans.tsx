import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { PlanCard, Select } from "../components/personal";
import {
  Button,
  Chips,
  Empty,
  ErrorText,
  go,
  Screen,
  statuses,
} from "../components/ui";
import { useData } from "../hooks/data";
export default function Plans() {
  const params = useLocalSearchParams();
  const q = useData("/plans"),
    vehicles = useData("/vehicles");
  const [vehicle, V] = useState(Number(params.vehicle) || 0),
    [filter, F] = useState("active");
  const list = (q.data || []).filter(
    (p: any) =>
      (!vehicle || p.vehicle_id === vehicle) &&
      (filter === "all" ||
        (filter === "active" &&
          !["completed", "cancelled"].includes(p.status) &&
          !p.vehicle_archived) ||
        p.status === filter),
  );
  return (
    <Screen title="Lịch bảo dưỡng" refresh={q.reload}>
      <Button
        title="Thêm lịch bảo dưỡng"
        onPress={() =>
          go("/plan-edit" + (vehicle ? "?vehicle=" + vehicle : ""))
        }
      />
      <Select
        label="Xe"
        value={vehicle}
        onChange={V}
        items={[
          { id: 0, name: "Tất cả xe" },
          ...(vehicles.data || []).map((v: any) => ({
            id: v.id,
            name: v.plate || v.brand + " " + v.model,
          })),
        ]}
      />
      <Chips
        value={filter}
        onChange={F}
        options={[
          { label: "Đang theo dõi", value: "active" },
          { label: "Tất cả", value: "all" },
          ...Object.entries(statuses).map(([value, label]) => ({
            label: String(label),
            value,
          })),
        ]}
      />
      <ErrorText text={q.error} />
      {list.map((p: any) => (
        <PlanCard key={p.id} plan={p} />
      ))}
      {q.data && !list.length && (
        <Empty text="Không có lịch trong bộ lọc này." />
      )}
    </Screen>
  );
}
