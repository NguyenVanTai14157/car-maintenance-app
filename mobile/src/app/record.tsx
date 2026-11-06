import { router, useLocalSearchParams } from "expo-router";
import { dayLabel } from "../components/personal";
import {
  Body,
  Button,
  Card,
  confirm,
  ErrorText,
  Feedback,
  go,
  Heading,
  money,
  Photo,
  Screen,
  useSubmit,
} from "../components/ui";
import { useData } from "../hooks/data";
import { api } from "../services/api";
export default function Record() {
  const { id } = useLocalSearchParams(),
    q = useData("/records/" + id),
    plans = useData("/plans");
  const r = q.data,
    task = useSubmit();
  const next = plans.data?.find((p: any) => p.source_record_id === r?.id);
  return (
    <Screen title="Chi tiết bảo dưỡng" refresh={q.reload}>
      <ErrorText text={q.error} />
      {r && (
        <>
          <Card>
            <Heading>{r.category_name}</Heading>
            <Body>{r.plate || r.brand + " " + r.model}</Body>
            <Body>
              Thực hiện: {dayLabel(r.performed_date)} ·{" "}
              {r.odometer.toLocaleString("vi-VN")} km
            </Body>
            <Heading>{money(r.cost)}</Heading>
            <Body>{r.content}</Body>
            <Body>{r.notes || "Không có ghi chú"}</Body>
            {r.images.map((image: string, i: number) => (
              <Photo key={i} uri={image} />
            ))}
            <Button
              title="Sửa bản ghi"
              secondary
              onPress={() => go("/record-edit?id=" + r.id)}
            />
            <Button
              title="Xóa bản ghi"
              danger
              disabled={task.busy}
              onPress={() =>
                confirm(
                  "Xóa bản ghi? Chi phí sẽ được tính lại. Kế hoạch liên kết sẽ trở về trạng thái theo ngày/km.",
                  () =>
                    void task.run(async () => {
                      await api("/records/" + r.id, "DELETE");
                      router.replace("/records");
                    }, ""),
                )
              }
            />
            <Feedback task={task} />
          </Card>
          {(r.suggestion?.due_date || r.suggestion?.due_km != null) && (
            <Card>
              <Heading>Đề xuất lần bảo dưỡng tiếp theo</Heading>
              <Body>
                Tính từ lần thực hiện thực tế này; chưa tự tạo kế hoạch.
              </Body>
              <Body>
                Ngày: {dayLabel(r.suggestion.due_date)} · Km:{" "}
                {r.suggestion.due_km ?? "Chưa đặt"}
              </Body>
              {next ? (
                <Button
                  title="Xem lịch tiếp theo đã tạo"
                  secondary
                  onPress={() => go("/plan?id=" + next.id)}
                />
              ) : (
                <Button
                  title="Xác nhận tạo lịch tiếp theo"
                  disabled={task.busy || r.vehicle_archived}
                  onPress={() =>
                    task.run(async () => {
                      const p = await api("/plans/from-record/" + r.id, "POST");
                      router.push(("/plan?id=" + p.id) as any);
                    }, "")
                  }
                />
              )}
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}
