import { useLocalSearchParams } from "expo-router";
import { PlanCard } from "../components/personal";
import {
  Body,
  Button,
  Card,
  confirm,
  ErrorText,
  Feedback,
  go,
  Screen,
  useSubmit,
} from "../components/ui";
import { useData } from "../hooks/data";
import { api } from "../services/api";
export default function Plan() {
  const { id } = useLocalSearchParams(),
    q = useData("/plans/" + id);
  const task = useSubmit(),
    p = q.data;
  return (
    <Screen title="Chi tiết kế hoạch" refresh={q.reload}>
      <ErrorText text={q.error} />
      {p && (
        <>
          <PlanCard plan={p} />
          <Card>
            <Body>
              Nhắc trước: {p.remind_days} ngày / {p.remind_km} km
            </Body>
            <Body>
              Chu kỳ: {p.interval_months || "—"} tháng / {p.interval_km || "—"}{" "}
              km
            </Body>
            <Body>{p.notes || "Không có ghi chú"}</Body>
            {!["completed", "cancelled"].includes(p.status) &&
              !p.vehicle_archived && (
                <>
                  <Button
                    title="Ghi nhận đã bảo dưỡng"
                    onPress={() => go("/record-edit?plan=" + p.id)}
                  />
                  <Button
                    title="Sửa kế hoạch"
                    secondary
                    onPress={() => go("/plan-edit?id=" + p.id)}
                  />
                  <Button
                    title="Hủy kế hoạch"
                    danger
                    disabled={task.busy}
                    onPress={() =>
                      confirm(
                        "Hủy kế hoạch này và ngừng nhắc?",
                        () =>
                          void task.run(async () => {
                            await api("/plans/" + p.id + "/cancel", "POST");
                            await q.reload();
                          }),
                      )
                    }
                  />
                </>
              )}
            {p.completed_record_id && (
              <Button
                title="Xem lần bảo dưỡng đã thực hiện"
                secondary
                onPress={() => go("/record?id=" + p.completed_record_id)}
              />
            )}
            <Feedback task={task} />
          </Card>
        </>
      )}
    </Screen>
  );
}
