import { useState } from "react";
import {
  Body,
  Button,
  Card,
  Chips,
  ErrorText,
  Feedback,
  Field,
  Heading,
  Screen,
  confirm,
  useSubmit,
} from "../components/ui";
import { useData } from "../hooks/data";
import { useSession } from "../hooks/session";
import { api } from "../services/api";
import { chooseBackup, exportBackup } from "../services/backup";
import { enableReminders } from "../services/reminders";
export default function Settings() {
  const q = useData("/settings");
  return (
    <Screen title="Cài đặt & sao lưu" refresh={q.reload}>
      <ErrorText text={q.error} />
      {q.data && (
        <SettingsForm
          key={JSON.stringify(q.data)}
          initial={q.data}
          reload={q.reload}
        />
      )}
    </Screen>
  );
}
function SettingsForm({ initial, reload }: any) {
  const [b, B] = useState(initial),
    task = useSubmit();
  const { user } = useSession();
  return (
    <>
      <Card>
        <Heading>Nhắc lịch</Heading>
        <Chips
          value={b.notifications}
          onChange={(v) => B({ ...b, notifications: v })}
          options={[
            { label: "Bật nhắc lịch", value: true },
            { label: "Tắt nhắc lịch", value: false },
          ]}
        />
        <Field
          label="Số ngày nhắc trước mặc định"
          placeholder="Ví dụ: 7 (nhắc trước 7 ngày)"
          value={b.remind_days}
          onChange={(v) => B({ ...b, remind_days: v })}
          numeric
        />
        <Field
          label="Số km nhắc trước mặc định"
          placeholder="Ví dụ: 500 (nhắc trước 500 km)"
          value={b.remind_km}
          onChange={(v) => B({ ...b, remind_km: v })}
          numeric
        />
        <Field
          label="Giờ nhắc trên điện thoại (0–23)"
          placeholder="Ví dụ: 9 (9 giờ sáng)"
          value={b.remind_hour}
          onChange={(v) => B({ ...b, remind_hour: v })}
          numeric
        />
        <Body>
          Mặc định áp dụng cho kế hoạch mới. Mỗi kế hoạch vẫn có ngưỡng nhắc
          riêng.
        </Body>
        <Body>
          Đơn vị: km · Chi phí: VND. Km được cập nhật thủ công, ứng dụng không
          tự theo dõi quãng đường.
        </Body>
        <Button
          title="Lưu cài đặt"
          disabled={task.busy}
          onPress={() =>
            task.run(async () => {
              await api("/settings", "PATCH", b);
              await reload();
            })
          }
        />
        <Button
          title="Cho phép thông báo trên điện thoại"
          secondary
          disabled={task.busy}
          onPress={() =>
            task.run(async () => {
              await enableReminders();
              await api("/settings", "PATCH", { ...b, notifications: true });
              await reload();
            }, "Đã cho phép nhắc lịch. Các lịch phù hợp sẽ được đồng bộ khi có kết nối.")
          }
        />
      </Card>
      <Card>
        <Heading>Sao lưu dữ liệu cá nhân</Heading>
        <Body>
          Dữ liệu đã lưu được đồng bộ theo tài khoản {user?.email}. Bạn có thể
          xuất thêm file JSON gồm xe, kế hoạch, lịch sử, chi phí và ảnh.
        </Body>
        <Button
          title="Xuất file sao lưu"
          secondary
          disabled={task.busy}
          onPress={() =>
            task.run(async () => {
              const data = await api("/backup");
              await exportBackup(data);
            }, "Đã mở nơi lưu/chia sẻ file sao lưu.")
          }
        />
        <Button
          title="Khôi phục từ file"
          secondary
          disabled={task.busy}
          onPress={() =>
            task.run(async () => {
              const backup = await chooseBackup();
              if (!backup) return;
              confirm(
                "Khôi phục sẽ thay thế toàn bộ dữ liệu xe/bảo dưỡng của tài khoản này. Hãy xuất bản sao hiện tại trước. Tiếp tục?",
                () =>
                  void task.run(async () => {
                    await api("/backup/restore", "POST", backup);
                    await reload();
                  }, "Đã khôi phục dữ liệu."),
              );
            }, "")
          }
        />
        <Body>
          Chỉ khôi phục file của chính bạn. Tài khoản và mật khẩu không nằm
          trong bản sao lưu.
        </Body>
      </Card>
      <Feedback task={task} />
    </>
  );
}
