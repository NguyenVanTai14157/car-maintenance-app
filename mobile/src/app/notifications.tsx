import React from "react";
import {
  Screen,
  Card,
  Heading,
  Body,
  Button,
  ErrorText,
  Empty,
  date,
  go,
  Feedback,
  useSubmit,
} from "../components/ui";
import { useData } from "../hooks/data";
import { api } from "../services/api";
export default function Notifications() {
  const q = useData("/notifications"),
    task = useSubmit();
  return (
    <Screen
      title="Thông báo"
      subtitle="Lịch hẹn, tiến độ và nhắc lịch được cập nhật trực tiếp khi có kết nối."
      refresh={q.reload}
    >
      <ErrorText text={q.error} />
      <Feedback task={task} />
      <Button
        title="Đánh dấu tất cả đã đọc"
        secondary
        onPress={() =>
          task.run(async () => {
            await api("/notifications/read", "POST");
            await q.reload();
          })
        }
      />
      {(q.data || []).map((n: any) => (
        <Card key={n.id}>
          <Heading>
            {n.read ? "" : "● "}
            {n.message}
          </Heading>
          <Body>{date(n.created_at)}</Body>
          {n.appointment_id && (
            <Button
              secondary
              title="Xem lịch liên quan"
              onPress={() => go("/appointment?id=" + n.appointment_id)}
            />
          )}
        </Card>
      ))}
      {q.data?.length === 0 && <Empty text="Chưa có thông báo." />}
    </Screen>
  );
}
