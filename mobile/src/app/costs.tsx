import { useState } from "react";
import { dayLabel, VehicleIdentifier } from "../components/personal";
import { FilterDropdown } from "../components/filter-dropdown";
import { Pressable, Text, View } from "react-native";
import { DateField } from "../components/date-field";
import { PeriodPicker } from "../components/period-picker";
import {
  Body,
  Card,
  Chips,
  Empty,
  ErrorText,
  Heading,
  money,
  Screen,
  go,
  s,
} from "../components/ui";
import { useData } from "../hooks/data";
export default function Costs() {
  const q = useData("/costs"),
    vs = useData("/vehicles"),
    cats = useData("/categories");
  const [vehicle, V] = useState(0),
    [category, C] = useState(0),
    [from, F] = useState(""),
    [to, T] = useState(""),
    [period, P] = useState("month"),
    [selectedPeriod, setSelectedPeriod] = useState("");
  const list = (q.data?.records || [])
    .filter(
      (r: any) =>
        (!vehicle || r.vehicle_id === vehicle) &&
        (!category || r.category_id === category) &&
        (!from || r.performed_date >= from) &&
        (!to || r.performed_date <= to),
    )
    .filter(
      (r: any) =>
        !selectedPeriod ||
        period === "category" ||
        r.performed_date.startsWith(selectedPeriod),
    );
  const grouped: Record<string, number> = {};
  for (const r of list) {
    const key =
      period === "category"
        ? r.category_name
        : r.performed_date.slice(0, period === "year" ? 4 : 7);
    grouped[key] = (grouped[key] || 0) + r.cost;
  }
  const validRange = !from || !to || from <= to;
  return (
    <Screen
      title="Chi phí bảo dưỡng"
      subtitle="Các khoản đã chi cho bảo dưỡng, bao gồm cả xe đã lưu trữ."
      refresh={q.reload}
    >
      <View style={styles.filterRow}>
        <FilterDropdown
          label="Theo xe"
          value={vehicle}
          onChange={V}
          options={[
            { value: 0, label: "Tất cả xe" },
            ...(vs.data || []).map((v: any) => ({
              value: v.id,
              label: v.plate || v.brand + " " + v.model,
            })),
          ]}
        />
        <FilterDropdown
          label="Theo hạng mục"
          value={category}
          onChange={C}
          options={[
            { value: 0, label: "Tất cả hạng mục" },
            ...(cats.data || []).map((item: any) => ({
              value: item.id,
              label: item.name,
            })),
          ]}
        />
      </View>
      <DateField
        label="Từ ngày"
        maximum={to || undefined}
        value={from}
        onChange={F}
      />
      <DateField
        label="Đến ngày"
        minimum={from || undefined}
        value={to}
        onChange={T}
      />
      <ErrorText text={q.error} />
      {!!from && !!to && from > to && (
        <ErrorText text="Ngày bắt đầu phải trước hoặc bằng ngày kết thúc." />
      )}
      <Chips
        value={period}
        onChange={(value) => {
          P(value);
          setSelectedPeriod("");
        }}
        options={[
          { label: "Theo tháng", value: "month" },
          { label: "Theo năm", value: "year" },
          { label: "Theo hạng mục", value: "category" },
        ]}
      />
      {(period === "month" || period === "year") && (
        <PeriodPicker
          mode={period}
          value={selectedPeriod}
          onChange={setSelectedPeriod}
        />
      )}
      {validRange &&
        Object.entries(grouped)
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([name, total]) => (
            <Card key={name}>
              <Heading>
                {period === "month"
                  ? `Tháng ${Number(name.slice(5))}/${name.slice(0, 4)}`
                  : period === "year"
                    ? `Năm ${name}`
                    : name}
              </Heading>
              <Body>Tổng chi phí: {money(total)}</Body>
            </Card>
          ))}
      {validRange && list.length > 0 && (
        <Heading>Chi tiết từng lần bảo dưỡng</Heading>
      )}
      {validRange &&
        list.map((r: any) => (
          <Pressable
            key={r.id}
            accessibilityRole="button"
            accessibilityLabel={`Xem chi phí lần bảo dưỡng ${r.id}`}
            onPress={() => go("/record?id=" + r.id)}
          >
            <Card>
              <Heading>{r.category_name}</Heading>
              <VehicleIdentifier vehicle={r} />
              <Body>Ngày thực hiện: {dayLabel(r.performed_date)}</Body>
              <Heading>Chi phí: {money(r.cost)}</Heading>
              <Text style={s.smallLink}>Xem chi tiết bảo dưỡng →</Text>
            </Card>
          </Pressable>
        ))}
      {validRange && q.data && !list.length && (
        <Empty text="Chưa có chi phí trong khoảng này." />
      )}
    </Screen>
  );
}

const styles = {
  filterRow: { flexDirection: "row" as const, gap: 12 },
};
