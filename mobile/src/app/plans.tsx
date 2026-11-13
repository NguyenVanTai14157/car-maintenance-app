import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { FilterDropdown } from "../components/filter-dropdown";
import { PlanCard } from "../components/personal";
import {
  Button,
  Empty,
  ErrorText,
  go,
  Screen,
  statuses,
} from "../components/ui";
import { useData } from "../hooks/data";
import { isMaintenanceFilter } from "../utils/maintenance-overview";
export default function Plans() {
  const params = useLocalSearchParams();
  const q = useData("/plans"),
    vehicles = useData("/vehicles");
  const [vehicle, V] = useState(Number(params.vehicle) || 0),
    [filter, F] = useState(
      isMaintenanceFilter(params.status) ? params.status : "active",
    );
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
      <View style={styles.filterRow}>
        <FilterDropdown
          label="Theo xe"
          value={vehicle}
          onChange={V}
          options={[
            { value: 0, label: "Tất cả xe" },
            ...(vehicles.data || []).map((v: any) => ({
              value: v.id,
              label: v.plate || v.brand + " " + v.model,
            })),
          ]}
        />
        <FilterDropdown
          label="Trạng thái"
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
      </View>
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

const styles = {
  filterRow: { flexDirection: "row" as const, gap: 12 },
};
