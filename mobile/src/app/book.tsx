import React, { useState } from "react";
import { router } from "expo-router";
import {
  Screen,
  Card,
  Heading,
  Body,
  Field,
  Button,
  Feedback,
  useSubmit,
  ErrorText,
  Chips,
  money,
  go,
} from "../components/ui";
import { useData } from "../hooks/data";
import { api } from "../services/api";
export default function Book() {
  const vehicles = useData("/vehicles"),
    garages = useData("/garages"),
    services = useData("/services");
  const [vehicle, V] = useState(0),
    [garage, G] = useState(0),
    [selected, S] = useState<number[]>([]),
    [day, D] = useState(""),
    [time, T] = useState("09:00"),
    [notes, N] = useState("");
  const task = useSubmit();
  const g = garages.data?.find((x: any) => x.id === garage);
  const chosen = (services.data || []).filter((x: any) =>
    selected.includes(x.id),
  );
  return (
    <Screen
      title="Đặt lịch bảo dưỡng"
      subtitle="Chọn xe, gara và thời gian phù hợp. Múi giờ Việt Nam."
      allowed={["customer"]}
    >
      <ErrorText text={vehicles.error || garages.error || services.error} />
      <Card>
        <Heading>1. Chọn xe</Heading>
        <Chips
          options={(vehicles.data || []).map((v: any) => ({
            label: v.plate,
            value: v.id,
          }))}
          value={vehicle}
          onChange={V}
        />
        {vehicles.data?.length === 0 && (
          <Button
            title="Thêm xe trước khi đặt lịch"
            onPress={() => go("/vehicles")}
          />
        )}
      </Card>
      <Card>
        <Heading>2. Chọn gara</Heading>
        <Chips
          options={(garages.data || [])
            .filter((x: any) => x.active)
            .map((v: any) => ({ label: v.name, value: v.id }))}
          value={garage}
          onChange={G}
        />
        {g && (
          <>
            <Body>{g.address}</Body>
            <Body>
              Mở cửa {g.open_hour}:00–{g.close_hour}:00 · Hủy/đổi trước{" "}
              {g.cancel_hours} giờ
            </Body>
          </>
        )}
      </Card>
      <Card>
        <Heading>3. Dịch vụ</Heading>
        {(services.data || []).map((v: any) => (
          <Button
            key={v.id}
            secondary={!selected.includes(v.id)}
            title={`${selected.includes(v.id) ? "✓ " : ""}${v.name} · ${money(v.price)}`}
            onPress={() =>
              S(
                selected.includes(v.id)
                  ? selected.filter((id) => id !== v.id)
                  : [...selected, v.id],
              )
            }
          />
        ))}
        <Body>
          Tổng dự kiến:{" "}
          {money(chosen.reduce((sum: number, v: any) => sum + v.price, 0))}
        </Body>
        <Body>
          Thời lượng:{" "}
          {chosen.reduce((sum: number, v: any) => sum + v.duration, 0)} phút
        </Body>
      </Card>
      <Card>
        <Heading>4. Ngày giờ & yêu cầu</Heading>
        <Field
          label="Ngày (YYYY-MM-DD)"
          placeholder="2026-11-05"
          value={day}
          onChange={D}
        />
        <Field
          label="Giờ (HH:mm, mốc 00 hoặc 30 phút)"
          value={time}
          onChange={T}
        />
        <Field label="Yêu cầu / ghi chú" value={notes} onChange={N} multiline />
        <Feedback task={task} />
        <Button
          title="Gửi yêu cầu đặt lịch"
          disabled={task.busy}
          onPress={() =>
            task.run(async () => {
              if (
                !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
                !/^\d{2}:\d{2}$/.test(time)
              )
                throw new Error("Nhập ngày YYYY-MM-DD và giờ HH:mm.");
              const a = await api("/appointments", "POST", {
                vehicle_id: vehicle,
                garage_id: garage,
                service_ids: selected,
                starts_at: `${day}T${time}:00+07:00`,
                notes,
              });
              router.replace(("/appointment?id=" + a.id) as any);
            }, "")
          }
        />
      </Card>
    </Screen>
  );
}
