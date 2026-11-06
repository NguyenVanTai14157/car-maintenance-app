import {
  Body,
  Button,
  Card,
  date,
  Empty,
  ErrorText,
  Feedback,
  go,
  Heading,
  Screen,
  useSubmit,
} from "../components/ui";
import { useData } from "../hooks/data";
import { api } from "../services/api";
export default function Notices() {
  const q = useData("/notifications"),
    task = useSubmit();
  return (
    <Screen
      title="Thông báo nhắc lịch"
      subtitle="Theo ngày, theo km hoặc cả hai. Km dựa trên lần cập nhật gần nhất của bạn."
      refresh={q.reload}
    >
      <ErrorText text={q.error} />
      <Feedback task={task} />
      <Button
        title="Đánh dấu tất cả đã đọc"
        secondary
        disabled={task.busy}
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
          {n.plan_id && (
            <Button
              title="Xem lịch liên quan"
              secondary
              onPress={() => go("/plan?id=" + n.plan_id)}
            />
          )}
        </Card>
      ))}
      {q.data && !q.data.length && <Empty text="Chưa có thông báo." />}
    </Screen>
  );
}
