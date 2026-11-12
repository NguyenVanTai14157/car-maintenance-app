import { useState } from "react";
import { Alert, Platform } from "react-native";
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
  const showSavedPopup = (enabled: boolean) => {
    const message = enabled
      ? "Đã bật nhắc lịch. Hãy cho phép thông báo trên điện thoại để nhận lời nhắc."
      : "Đã tắt thông báo nhắc lịch. Lịch bảo dưỡng vẫn được theo dõi trong ứng dụng.";
    if (Platform.OS === "web") globalThis.alert(message);
    else Alert.alert("Đã lưu cài đặt", message, [{ text: "Đã hiểu" }]);
  };
  return (
    <>
      <Card>
        <Heading>Nhắc lịch</Heading>
        <Chips
          value={b.notifications}
          onChange={(v) => B({ ...b, notifications: v })}
          options={[
            { label: "Bật nhắc lịch", value: true },
            { label: "Tắt thông báo nhắc lịch", value: false },
          ]}
        />
        {b.notifications ? (
          <>
            <Field
              label="Số ngày nhắc trước mặc định"
              placeholder="Ví dụ: 7"
              unit="ngày"
              value={b.remind_days}
              onChange={(v) => B({ ...b, remind_days: v })}
              numeric
            />
            <Field
              label="Số km nhắc trước mặc định"
              placeholder="Ví dụ: 500"
              unit="km"
              value={b.remind_km}
              onChange={(v) => B({ ...b, remind_km: v })}
              numeric
            />
            <Field
              label="Giờ nhắc trên điện thoại (0–23)"
              placeholder="Ví dụ: 9 (9 giờ sáng)"
              unit="giờ"
              value={b.remind_hour}
              onChange={(v) => B({ ...b, remind_hour: v })}
              numeric
            />
          </>
        ) : (
          <Body>
            Thông báo đang tắt. Lịch bảo dưỡng vẫn được theo dõi trong ứng dụng.
          </Body>
        )}
        <Button
          title="Lưu cài đặt"
          disabled={task.busy}
          onPress={() =>
            task.run(async () => {
              await api("/settings", "PATCH", b);
              await reload();
              showSavedPopup(Boolean(b.notifications));
            }, "")
          }
        />
        {b.notifications && (
          <Button
            title="Cho phép thông báo trên điện thoại"
            secondary
            disabled={task.busy}
            onPress={() =>
              task.run(async () => {
                await enableReminders();
                await api("/settings", "PATCH", { ...b, notifications: true });
                await reload();
              }, "Đã bật nhắc lịch trên điện thoại. Ứng dụng sẽ cập nhật các lời nhắc khi có kết nối mạng.")
            }
          />
        )}
      </Card>
      <Card>
        <Heading>Sao lưu dữ liệu cá nhân</Heading>
        <Body>
          Dữ liệu được lưu theo tài khoản {user?.email}. Bạn có thể lưu thêm bản
          sao dự phòng để khôi phục xe, lịch bảo dưỡng, chi phí và ảnh khi cần.
        </Body>
        <Button
          title="Lưu bản sao dự phòng"
          secondary
          disabled={task.busy}
          onPress={() =>
            task.run(async () => {
              const data = await api("/backup");
              await exportBackup(data);
            }, "Đã mở nơi lưu hoặc chia sẻ bản sao dự phòng.")
          }
        />
        <Button
          title="Khôi phục dữ liệu"
          secondary
          disabled={task.busy}
          onPress={() =>
            task.run(async () => {
              const backup = await chooseBackup();
              if (!backup) return;
              confirm(
                "Khôi phục sẽ thay thế toàn bộ dữ liệu xe và bảo dưỡng hiện tại bằng bản sao bạn chọn. Hãy lưu một bản sao dự phòng trước khi tiếp tục. Bạn có muốn khôi phục không?",
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
          Chỉ chọn tệp được xuất từ AutoCare. Bạn có thể khôi phục vào tài khoản
          đang đăng nhập; tệp sao lưu không chứa tài khoản và mật khẩu.
        </Body>
      </Card>
      <Feedback task={task} />
    </>
  );
}
