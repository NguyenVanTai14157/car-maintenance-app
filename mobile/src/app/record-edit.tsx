import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { day, Loading, Select } from "../components/personal";
import {
  Body,
  Button,
  Card,
  ErrorText,
  Feedback,
  Field,
  go,
  Heading,
  Photo,
  pickMaintenancePhotos,
  Screen,
  useSubmit,
} from "../components/ui";
import { useData } from "../hooks/data";
import { api } from "../services/api";
export default function RecordEdit() {
  const params = useLocalSearchParams(),
    records = useData("/records"),
    plans = useData("/plans"),
    vehicles = useData("/vehicles"),
    cats = useData("/categories");
  const current = params.id
    ? (records.data || []).find((r: any) => r.id === Number(params.id))
    : null;
  const plan = params.plan
    ? (plans.data || []).find((p: any) => p.id === Number(params.plan))
    : null;
  return (
    <Screen title={params.id ? "Sửa bản ghi" : "Ghi nhận bảo dưỡng"}>
      {records.data && plans.data && vehicles.data && cats.data ? (
        (params.id && !current) || (params.plan && !plan) ? (
          <ErrorText text="Không tìm thấy dữ liệu." />
        ) : (
          <RecordForm
            initial={current}
            plan={plan}
            vehicle={Number(params.vehicle) || 0}
            vehicles={vehicles.data}
            cats={cats.data}
          />
        )
      ) : (
        <Loading
          error={records.error || plans.error || vehicles.error || cats.error}
        />
      )}
    </Screen>
  );
}
function RecordForm({ initial, plan, vehicle, vehicles, cats }: any) {
  const active = vehicles.filter(
      (v: any) => !v.archived || v.id === initial?.vehicle_id,
    ),
    categories = cats.filter(
      (c: any) => c.active || c.id === initial?.category_id,
    );
  const chosen =
    initial?.vehicle_id || plan?.vehicle_id || vehicle || active[0]?.id || 0;
  const [b, B] = useState<any>(
    initial || {
      vehicle_id: chosen,
      category_id: plan?.category_id || categories[0]?.id || 0,
      performed_date: day(),
      odometer: vehicles.find((v: any) => v.id === chosen)?.odometer ?? "",
      cost: "",
      content: "",
      notes: "",
      images: [],
      interval_months: plan?.interval_months || "",
      interval_km: plan?.interval_km || "",
    },
  );
  const task = useSubmit();
  const examples: Record<string, string> = {
    performed_date: "Ví dụ: 2026-10-20",
    odometer: "Ví dụ: 35000 (km)",
    cost: "Ví dụ: 650000 (nhập số, không dấu chấm)",
    content: "Ví dụ: Thay dầu động cơ và lọc dầu",
    notes: "Ví dụ: Dầu 5W-30, bảo dưỡng tại gara gần nhà",
    interval_months: "Ví dụ: 6 (mỗi 6 tháng)",
    interval_km: "Ví dụ: 5000 (mỗi 5000 km)",
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
  if (!active.length)
    return (
      <Card>
        <Body>Cần thêm xe trước khi ghi nhận.</Body>
        <Button title="Thêm xe" onPress={() => go("/vehicles")} />
      </Card>
    );
  return (
    <Card>
      {plan && (
        <Body>
          Ghi nhận cho kế hoạch #{plan.id}. Chỉ đánh dấu hoàn thành khi lưu
          thành công.
        </Body>
      )}
      {!plan && !initial?.plan_id ? (
        <>
          <Select
            label="Xe đã bảo dưỡng"
            value={b.vehicle_id}
            onChange={(v) =>
              B({
                ...b,
                vehicle_id: v,
                odometer: vehicles.find((x: any) => x.id === v)?.odometer ?? "",
              })
            }
            items={active.map((v: any) => ({
              id: v.id,
              name: v.plate || v.brand + " " + v.model,
            }))}
          />
          <Select
            label="Hạng mục thực hiện"
            value={b.category_id}
            onChange={(v) => B({ ...b, category_id: v })}
            items={categories}
          />
        </>
      ) : (
        <Body>
          {vehicles.find((v: any) => v.id === b.vehicle_id)?.brand} ·{" "}
          {cats.find((c: any) => c.id === b.category_id)?.name}
        </Body>
      )}
      {field("performed_date", "Ngày thực hiện (YYYY-MM-DD)")}
      {field("odometer", "Số km khi thực hiện", true)}
      <Body>
        Có thể nhập lịch sử cũ với km nhỏ hơn hiện tại, nhưng phải đúng thứ tự
        ngày/km.
      </Body>
      {field("cost", "Chi phí (VND, nhập 0 nếu không phát sinh)", true)}
      {field("content", "Nội dung bảo dưỡng")}
      {field("notes", "Ghi chú")}
      {field("interval_months", "Chu kỳ tháng để đề xuất lần sau", true)}
      {field("interval_km", "Chu kỳ km để đề xuất lần sau", true)}
      <Heading>Hóa đơn / phụ tùng (không bắt buộc)</Heading>
      {b.images.map((image: string, i: number) => (
        <Card key={i}>
          <Photo uri={image} />
          <Button
            title={"Bỏ ảnh " + (i + 1)}
            secondary
            onPress={() =>
              B({
                ...b,
                images: b.images.filter(
                  (_: string, index: number) => index !== i,
                ),
              })
            }
          />
        </Card>
      ))}
      <Button
        title="Chọn ảnh hóa đơn / phụ tùng"
        secondary
        disabled={task.busy}
        onPress={() =>
          task.run(async () => {
            const images = await pickMaintenancePhotos(false);
            const all = [...new Set([...b.images, ...images])];
            if (all.length > 10)
              throw Error("Nhóm ảnh quá lớn. Hãy bỏ bớt ảnh rồi thử lại.");
            B({ ...b, images: all });
          }, "")
        }
      />
      <Button
        title="Chụp ảnh hóa đơn / phụ tùng"
        secondary
        disabled={task.busy}
        onPress={() =>
          task.run(async () => {
            const images = await pickMaintenancePhotos(true);
            B({ ...b, images: [...b.images, ...images] });
          }, "")
        }
      />
      <Feedback task={task} />
      <Button
        title="Lưu bản ghi bảo dưỡng"
        disabled={task.busy}
        onPress={() =>
          task.run(async () => {
            const r = await api(
              "/records" + (initial ? "/" + initial.id : ""),
              initial ? "PATCH" : "POST",
              { ...b, plan_id: plan?.id || initial?.plan_id },
            );
            router.replace(("/record?id=" + r.id) as any);
          }, "")
        }
      />
    </Card>
  );
}
