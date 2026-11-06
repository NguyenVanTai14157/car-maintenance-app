import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { dayLabel, Select } from "../components/personal";
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
  const params = useLocalSearchParams(),
    q = useData("/records"),
    vehicles = useData("/vehicles"),
    cats = useData("/categories");
  const [vehicle, V] = useState(Number(params.vehicle) || 0),
    [category, C] = useState(0),
    [from, F] = useState(""),
    [to, T] = useState(""),
    [search, S] = useState("");
  const list = (q.data || []).filter(
    (r: any) =>
      (!vehicle || r.vehicle_id === vehicle) &&
      (!category || r.category_id === category) &&
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
        title="Thêm bản ghi bảo dưỡng"
        onPress={() =>
          go("/record-edit" + (vehicle ? "?vehicle=" + vehicle : ""))
        }
      />
      <Select
        label="Theo xe"
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
      <Select
        label="Theo hạng mục"
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
      <Field
        label="Tìm nội dung / biển số"
        placeholder="Ví dụ: thay dầu hoặc 51A12345"
        value={search}
        onChange={S}
      />
      <ErrorText text={q.error} />
      {from && to && from > to ? (
        <ErrorText text="Ngày bắt đầu phải trước ngày kết thúc." />
      ) : (
        list.map((r: any) => (
          <Card key={r.id}>
            <Heading>{r.category_name}</Heading>
            <Body>
              {r.plate || r.brand + " " + r.model} ·{" "}
              {dayLabel(r.performed_date)}
            </Body>
            <Body>
              {r.odometer.toLocaleString("vi-VN")} km · {money(r.cost)}
            </Body>
            <Body>{r.content}</Body>
            <Button
              title="Xem chi tiết bản ghi"
              secondary
              onPress={() => go("/record?id=" + r.id)}
            />
          </Card>
        ))
      )}
      {q.data && !list.length && <Empty text="Chưa có lịch sử bảo dưỡng." />}
    </Screen>
  );
}
