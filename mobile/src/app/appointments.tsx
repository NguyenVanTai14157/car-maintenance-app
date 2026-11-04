import React, { useState } from "react";
import { useLocalSearchParams } from "expo-router";
import {
  Screen,
  Card,
  Heading,
  Body,
  Field,
  Button,
  ErrorText,
  Empty,
  Chips,
  Badge,
  date,
  money,
  go,
  statuses,
} from "../components/ui";
import { useData } from "../hooks/data";
import { useSession } from "../hooks/session";
export default function Appointments() {
  const { vehicle } = useLocalSearchParams();
  const q = useData("/appointments"),
    { user } = useSession();
  const [filter, F] = useState("active"),
    [search, S] = useState("");
  const list = (q.data || []).filter(
    (a: any) =>
      (!vehicle || String(a.vehicle_id) === String(vehicle)) &&
      `${a.plate} ${a.customer_name} ${a.id}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (filter === "all" ||
        (filter === "active" &&
          !["completed", "cancelled", "rejected"].includes(a.status)) ||
        a.status === filter),
  );
  return (
    <Screen
      title={
        user?.role === "technician" ? "Công việc của tôi" : "Lịch hẹn & lịch sử"
      }
      subtitle={
        vehicle
          ? "Đang lọc theo xe đã chọn"
          : "Theo dõi từ khi đặt lịch đến bàn giao xe."
      }
      refresh={q.reload}
    >
      <Field
        label="Tìm biển số, khách hàng hoặc mã lịch"
        value={search}
        onChange={S}
      />
      <Chips
        value={filter}
        onChange={F}
        options={[
          { label: "Đang xử lý", value: "active" },
          { label: "Tất cả", value: "all" },
          ...[
            "pending",
            "confirmed",
            "in_progress",
            "ready",
            "completed",
            "cancelled",
            "rejected",
          ].map((k) => ({ label: statuses[k], value: k })),
        ]}
      />
      <ErrorText text={q.error} />
      {list.map((a: any) => (
        <Card key={a.id}>
          <Badge status={a.status} />
          <Heading>
            {a.plate} · #{a.id}
          </Heading>
          <Body>
            {date(a.starts_at)} · {a.garage_name}
          </Body>
          <Body>
            {a.customer_name}{" "}
            {a.technician_name ? `· KTV: ${a.technician_name}` : ""}
          </Body>
          <Body>
            {money(a.total)} · {a.paid ? "Đã thanh toán" : "Chưa thanh toán"}
          </Body>
          <Button
            title="Xem chi tiết →"
            secondary
            onPress={() => go("/appointment?id=" + a.id)}
          />
        </Card>
      ))}
      {!q.loading && !list.length && (
        <Empty text="Không có lịch phù hợp bộ lọc." />
      )}
    </Screen>
  );
}
