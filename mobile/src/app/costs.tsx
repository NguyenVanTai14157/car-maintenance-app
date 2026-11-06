import { useState } from "react";
import { Select } from "../components/personal";
import {
  Body,
  Card,
  Chips,
  Empty,
  ErrorText,
  Field,
  Heading,
  money,
  Screen,
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
    [period, P] = useState("month");
  const list = (q.data?.records || []).filter(
    (r: any) =>
      (!vehicle || r.vehicle_id === vehicle) &&
      (!category || r.category_id === category) &&
      (!from || r.performed_date >= from) &&
      (!to || r.performed_date <= to),
  );
  const grouped: Record<string, number> = {};
  for (const r of list) {
    const key =
      period === "category"
        ? r.category_name
        : r.performed_date.slice(0, period === "year" ? 4 : 7);
    grouped[key] = (grouped[key] || 0) + r.cost;
  }
  return (
    <Screen
      title="Chi phí bảo dưỡng"
      subtitle="Chi phí từ bản ghi thực tế; bao gồm cả xe đã lưu trữ."
      refresh={q.reload}
    >
      <Select
        label="Xe"
        value={vehicle}
        onChange={V}
        items={[
          { id: 0, name: "Tất cả xe" },
          ...(vs.data || []).map((v: any) => ({
            id: v.id,
            name: v.plate || v.brand + " " + v.model,
          })),
        ]}
      />
      <Select
        label="Hạng mục"
        value={category}
        onChange={C}
        items={[{ id: 0, name: "Tất cả hạng mục" }, ...(cats.data || [])]}
      />
      <Field
        label="Từ ngày (YYYY-MM-DD)"
        placeholder="Ví dụ: 2026-01-01"
        value={from}
        onChange={F}
      />
      <Field
        label="Đến ngày (YYYY-MM-DD)"
        placeholder="Ví dụ: 2026-12-31"
        value={to}
        onChange={T}
      />
      <ErrorText text={q.error} />
      <Card>
        <Heading>
          {money(list.reduce((sum: number, r: any) => sum + r.cost, 0))}
        </Heading>
        <Body>{list.length} lần bảo dưỡng trong bộ lọc</Body>
      </Card>
      <Chips
        value={period}
        onChange={P}
        options={[
          { label: "Theo tháng", value: "month" },
          { label: "Theo năm", value: "year" },
          { label: "Theo hạng mục", value: "category" },
        ]}
      />
      {Object.entries(grouped)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([name, total]) => (
          <Card key={name}>
            <Heading>{name}</Heading>
            <Body>{money(total)}</Body>
          </Card>
        ))}
      {!list.length && <Empty text="Chưa có chi phí trong khoảng này." />}
    </Screen>
  );
}
