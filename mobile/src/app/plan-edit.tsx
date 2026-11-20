import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { day, Loading, Select } from "../components/personal";
import { DateField } from "../components/date-field";
import { CategorySelect } from "../components/category-select";
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
    <Screen title={params.id ? "Sửa lịch bảo dưỡng" : "Tạo lịch bảo dưỡng"}>
      {q.data && vehicles.data && cats.data && settings.data ? (
        params.id && !current ? (
          <ErrorText text="Không tìm thấy lịch." />
        ) : (
          <PlanForm
            initial={current}
            vehicle={Number(params.vehicle) || 0}
            vehicles={vehicles.data}
            cats={cats.data}
            refreshCategories={cats.reload}
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
function PlanForm({
  initial,
  vehicle,
  vehicles,
  cats,
  settings,
  refreshCategories,
}: any) {
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
      remind_days: "",
      remind_km: settings.remind_km,
      interval_months: "",
      interval_km: "",
      notes: "",
    },
  );
  const task = useSubmit();
  const selectedVehicle = activeVehicles.find((v: any) => v.id === b.vehicle_id);
  const maxRemindDays = (date: string, today: string) =>
    Math.max(0, Math.min(365, (Date.parse(date + "T00:00Z") -
      Date.parse(today + "T00:00Z")) / 86400000));
  const today = day();
  const examples: Record<string, string> = {
    due_date: "Ví dụ: 2026-12-20",
    due_km: "Ví dụ: 45000",
    remind_days: "Nhập số ngày",
    remind_km: "Ví dụ: 500",
    interval_months: "Ví dụ: 6",
    interval_km: "Ví dụ: 5000",
    notes: "Ví dụ: Kiểm tra lọc gió khi thay dầu",
  };
  const field = (
    key: string,
    label: string,
    numeric = false,
    unit?: string,
  ) => (
    <Field
      label={label}
      placeholder={examples[key]}
      value={b[key]}
      onChange={(v) => B({ ...b, [key]: v })}
      numeric={numeric}
      unit={unit}
      multiline={key === "notes"}
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
      <CategorySelect
        label="Hạng mục"
        value={b.category_id}
        onChange={(v) => B({ ...b, category_id: v })}
        items={activeCats}
        refresh={refreshCategories}
      />
      <DateField
        label="Ngày dự kiến (có thể bỏ trống)"
        minimum={today}
        hint="Chọn từ hôm nay trở đi."
        value={b.due_date}
        onChange={(v) => B({ ...b, due_date: v, remind_days: v ? b.remind_days : "" })}
      />
      {field("remind_days", "Nhắc trước bao nhiêu ngày", true, "ngày")}
      {field("due_km", "Số km đến hạn (có thể bỏ trống)", true, "km")}
      {field("remind_km", "Nhắc trước bao nhiêu km", true, "km")}
      {field("interval_months", "Chu kỳ tháng (không bắt buộc)", true, "tháng")}
      {field("interval_km", "Chu kỳ km (không bắt buộc)", true, "km")}
      <Body>
        Ví dụ: 6 tháng hoặc 5000 km để đề xuất lần tiếp theo. Bỏ trống nếu chỉ
        bảo dưỡng một lần.
      </Body>
      {field("notes", "Ghi chú")}
      <Feedback task={task} />
      <Button
        title="Lưu lịch bảo dưỡng"
        disabled={task.busy}
        onPress={() =>
          task.run(async () => {
            const today = day();
            if (b.due_date && b.due_date < today)
              throw Error("Ngày dự kiến bảo dưỡng phải từ hôm nay trở đi.");
            const remindDays = Number(b.remind_days ?? 0);
            if (b.due_date) {
              const max = maxRemindDays(b.due_date, today);
              if (b.remind_days == null || b.remind_days === "" ||
                  !Number.isInteger(remindDays) || remindDays < 0 || remindDays > max)
                throw Error(max === 0
                  ? "Lịch đến hạn hôm nay. Hãy nhập 0."
                  : `Nhập số ngày nhắc trước từ 0 đến ${max}.`);
            } else if (remindDays !== 0) {
              throw Error("Cần chọn ngày dự kiến để đặt nhắc trước theo ngày.");
            }
            const hasDueKm = b.due_km != null && b.due_km !== "";
            if (!b.due_date && !hasDueKm)
              throw Error("Cần ngày dự kiến hoặc số km đến hạn.");
            if (hasDueKm && selectedVehicle && Number(b.due_km) < selectedVehicle.odometer)
              throw Error("Số km đến hạn không được thấp hơn số km hiện tại của xe.");
            const result = await api(
              "/plans" + (initial ? "/" + initial.id : ""),
              initial ? "PATCH" : "POST",
              { ...b, remind_days: remindDays },
            );
            router.replace(("/plan?id=" + result.id) as any);
          }, "")
        }
      />
    </Card>
  );
}
