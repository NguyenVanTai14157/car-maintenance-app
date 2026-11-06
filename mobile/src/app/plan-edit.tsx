import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Loading, Select } from "../components/personal";
import {
  Body,
  Button,
  Card,
  ErrorText,
  Feedback,
  Field,
  go,
  Screen,
  useSubmit,
} from "../components/ui";
import { useData } from "../hooks/data";
import { api } from "../services/api";
export default function EditPlan() {
  const params = useLocalSearchParams(),
    q = useData("/plans"),
    vehicles = useData("/vehicles"),
    cats = useData("/categories"),
    settings = useData("/settings");
  const current = params.id
    ? (q.data || []).find((p: any) => p.id === Number(params.id))
    : null;
  return (
    <Screen title={params.id ? "Sửa kế hoạch" : "Tạo lịch bảo dưỡng"}>
      {q.data && vehicles.data && cats.data && settings.data ? (
        params.id && !current ? (
          <ErrorText text="Không tìm thấy lịch." />
        ) : (
          <PlanForm
            initial={current}
            vehicle={Number(params.vehicle) || 0}
            vehicles={vehicles.data}
            cats={cats.data}
            settings={settings.data}
          />
        )
      ) : (
        <Loading
          error={q.error || vehicles.error || cats.error || settings.error}
        />
      )}
    </Screen>
  );
}
function PlanForm({ initial, vehicle, vehicles, cats, settings }: any) {
  const activeVehicles = vehicles.filter((v: any) => !v.archived),
    activeCats = cats.filter(
      (c: any) => c.active || c.id === initial?.category_id,
    );
  const [b, B] = useState<any>(
    initial || {
      vehicle_id: vehicle || activeVehicles[0]?.id || 0,
      category_id: activeCats[0]?.id || 0,
      due_date: "",
      due_km: "",
      remind_days: settings.remind_days,
      remind_km: settings.remind_km,
      interval_months: "",
      interval_km: "",
      notes: "",
    },
  );
  const task = useSubmit();
  const examples: Record<string, string> = {
    due_date: "Ví dụ: 2026-12-20",
    due_km: "Ví dụ: 45000 (km)",
    remind_days: "Ví dụ: 7 (nhắc trước 7 ngày)",
    remind_km: "Ví dụ: 500 (nhắc trước 500 km)",
    interval_months: "Ví dụ: 6 (mỗi 6 tháng)",
    interval_km: "Ví dụ: 5000 (mỗi 5000 km)",
    notes: "Ví dụ: Kiểm tra lọc gió khi thay dầu",
  };
  const field = (key: string, label: string, numeric = false) => (
    <Field
      label={label}
      placeholder={examples[key]}
      value={b[key]}
      onChange={(v) => B({ ...b, [key]: v })}
      numeric={numeric}
    />
  );
  if (!activeVehicles.length)
    return (
      <Card>
        <Body>Thêm hoặc khôi phục xe trước khi tạo lịch.</Body>
        <Button title="Xe của tôi" onPress={() => go("/vehicles")} />
      </Card>
    );
  return (
    <Card>
      <Select
        label="Chọn xe"
        value={b.vehicle_id}
        onChange={(v) => B({ ...b, vehicle_id: v })}
        items={activeVehicles.map((v: any) => ({
          id: v.id,
          name: v.plate || v.brand + " " + v.model,
        }))}
      />
      <Select
        label="Hạng mục"
        value={b.category_id}
        onChange={(v) => B({ ...b, category_id: v })}
        items={activeCats}
      />
      <Body>
        Nhập ngày, km hoặc cả hai. Hệ thống nhắc theo ngưỡng đạt trước và ghi rõ
        lý do.
      </Body>
      {field("due_date", "Ngày dự kiến (YYYY-MM-DD, có thể bỏ trống)")}
      {field("due_km", "Số km đến hạn (có thể bỏ trống)", true)}
      {field("remind_days", "Nhắc trước bao nhiêu ngày", true)}
      {field("remind_km", "Nhắc trước bao nhiêu km", true)}
      {field("interval_months", "Chu kỳ tháng (không bắt buộc)", true)}
      {field("interval_km", "Chu kỳ km (không bắt buộc)", true)}
      {field("notes", "Ghi chú")}
      <Feedback task={task} />
      <Button
        title="Lưu kế hoạch"
        disabled={task.busy}
        onPress={() =>
          task.run(async () => {
            const result = await api(
              "/plans" + (initial ? "/" + initial.id : ""),
              initial ? "PATCH" : "POST",
              b,
            );
            router.replace(("/plan?id=" + result.id) as any);
          }, "")
        }
      />
    </Card>
  );
}
