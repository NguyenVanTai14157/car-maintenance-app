import { router, useLocalSearchParams } from "expo-router";
import { dayLabel, VehicleSummary } from "../components/personal";
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
            <VehicleSummary vehicle={r} />
            <Body>Ngày thực hiện: {dayLabel(r.performed_date)}</Body>
            <Body>
              Số km khi thực hiện: {r.odometer.toLocaleString("vi-VN")} km
            </Body>
            <Heading>Chi phí: {money(r.cost)}</Heading>
            <Body>Nội dung bảo dưỡng: {r.content}</Body>
            <Body>Ghi chú: {r.notes || "Không có ghi chú"}</Body>
            {r.images.map((image: string, i: number) => (
              <Photo key={i} uri={image} />
            ))}
            <Button
              title="Sửa thông tin bảo dưỡng"
              secondary
              onPress={() => go("/record-edit?id=" + r.id)}
            />
            <Button
              title="Xóa lần bảo dưỡng này"
              danger
              disabled={task.busy}
              onPress={() =>
                confirm(
                  "Bạn có muốn xóa lần bảo dưỡng này? Tổng chi phí sẽ được tính lại. Nếu lần bảo dưỡng này đã hoàn thành một lịch, lịch đó sẽ được mở lại và tiếp tục nhắc theo ngày hoặc số km.",
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
                Ngày và số km được tính từ lần bảo dưỡng vừa lưu. Bấm tạo lịch
                nếu bạn muốn được nhắc cho lần tiếp theo.
              </Body>
              <Body>Ngày dự kiến: {dayLabel(r.suggestion.due_date)}</Body>
              <Body>
                Km đến hạn:{" "}
                {r.suggestion.due_km == null
                  ? "Chưa đặt"
                  : `${r.suggestion.due_km.toLocaleString("vi-VN")} km`}
              </Body>
              {next ? (
                <Button
                  title="Xem lịch tiếp theo đã tạo"
                  secondary
                  onPress={() => go("/plan?id=" + next.id)}
                />
              ) : (
                <Button
                  title="Tạo lịch bảo dưỡng tiếp theo"
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
