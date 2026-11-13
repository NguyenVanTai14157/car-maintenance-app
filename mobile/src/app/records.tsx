import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { dayLabel, VehicleIdentifier } from "../components/personal";
import { DateField } from "../components/date-field";
import { FilterDropdown } from "../components/filter-dropdown";
import {
  Body,
  Button,
  Card,
  Empty,
  ErrorText,
  Field,
  go,
  Heading,
  money,
  Screen,
} from "../components/ui";
import { useData } from "../hooks/data";
export default function History() {
  const params = useLocalSearchParams();
  const filterKey = JSON.stringify([
    params.vehicle,
    params.category,
    params.from,
    params.to,
    params.withCost,
  ]);
  return <HistoryContent key={filterKey} params={params} />;
}
function HistoryContent({
  params,
}: {
  params: ReturnType<typeof useLocalSearchParams>;
}) {
  const q = useData("/records"),
    vehicles = useData("/vehicles"),
    cats = useData("/categories");
  const [vehicle, V] = useState(Number(params.vehicle) || 0),
    [category, C] = useState(Number(params.category) || 0),
    [from, F] = useState(typeof params.from === "string" ? params.from : ""),
    [to, T] = useState(typeof params.to === "string" ? params.to : ""),
    [search, S] = useState(""),
    [withCost, setWithCost] = useState(params.withCost === "1");
  const list = (q.data || []).filter(
    (r: any) =>
      (!vehicle || r.vehicle_id === vehicle) &&
      (!category || r.category_id === category) &&
      (!withCost || r.cost > 0) &&
      (!from || r.performed_date >= from) &&
      (!to || r.performed_date <= to) &&
      [r.content, r.notes, r.category_name, r.plate]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <Screen title="Lịch sử bảo dưỡng" refresh={q.reload}>
      <Button
        title="Thêm lần bảo dưỡng"
        onPress={() =>
          go("/record-edit" + (vehicle ? "?vehicle=" + vehicle : ""))
        }
      />
      <FilterDropdown
        label="Chi phí"
        value={withCost ? "with-cost" : "all"}
        onChange={(value: string) => setWithCost(value === "with-cost")}
        options={[
          { label: "Tất cả lịch sử", value: "all" },
          { label: "Có phát sinh chi phí", value: "with-cost" },
        ]}
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
              label: v.plate || `${v.brand} ${v.model}`,
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
      <Field
        label="Tìm nội dung / biển số"
        placeholder="Ví dụ: thay dầu hoặc 51A12345"
        value={search}
        onChange={S}
      />
      <ErrorText text={q.error} />
      {withCost && q.data && (
        <Card>
          <Heading>
            Tổng chi phí:{" "}
            {money(list.reduce((total: number, r: any) => total + r.cost, 0))}
          </Heading>
        </Card>
      )}
      {from && to && from > to ? (
        <ErrorText text="Ngày bắt đầu phải trước ngày kết thúc." />
      ) : (
        list.map((r: any) => (
          <Card key={r.id}>
            <Heading>{r.category_name}</Heading>
            <VehicleIdentifier vehicle={r} />
            <Body>Ngày thực hiện: {dayLabel(r.performed_date)}</Body>
            <Body>Chi phí: {money(r.cost)}</Body>
            <Button
              title="Xem chi tiết bảo dưỡng"
              secondary
              onPress={() => go("/record?id=" + r.id)}
            />
          </Card>
        ))
      )}
      {q.data && !list.length && (
        <Empty
          text={
            withCost
              ? "Chưa có lịch sử bảo dưỡng phát sinh chi phí."
              : "Chưa có lịch sử bảo dưỡng."
          }
        />
      )}
    </Screen>
  );
}

const styles = {
  filterRow: {
    flexDirection: "row" as const,
    gap: 12,
  },
};
