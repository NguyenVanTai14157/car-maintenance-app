import React, { useState } from "react";
import {
  Screen,
  Card,
  Heading,
  Body,
  Field,
  Button,
  Feedback,
  useSubmit,
  ErrorText,
  Chips,
} from "../components/ui";
import { useData } from "../hooks/data";
import { api } from "../services/api";
export default function Garages() {
  const q = useData("/garages"),
    task = useSubmit();
  const [form, F] = useState<any>(null);
  const fields = [
    ["name", "Tên gara"],
    ["address", "Địa chỉ"],
    ["open_hour", "Giờ mở cửa (0–23)"],
    ["close_hour", "Giờ đóng cửa (1–24)"],
    ["capacity", "Sức chứa xe đồng thời"],
    ["cancel_hours", "Hủy/đổi trước ít nhất (giờ)"],
    ["reminder_hours", "Nhắc lịch trước (giờ)"],
    ["notification_template", "Nội dung đầu thông báo nhắc lịch"],
  ];
  return (
    <Screen title="Gara & cấu hình" allowed={["admin"]} refresh={q.reload}>
      <ErrorText text={q.error} />
      <Button
        title="＋ Thêm gara"
        onPress={() => F({ name: "", address: "" })}
      />
      <Feedback task={task} />
      {form && (
        <Card>
          <Heading>{form.id ? "Cấu hình gara" : "Gara mới"}</Heading>
          {fields
            .filter((_, i) => form.id || i < 2)
            .map(([key, label]) => (
              <Field
                key={key}
                label={label}
                value={form[key]}
                onChange={(v) => F({ ...form, [key]: v })}
                numeric={
                  !["name", "address", "notification_template"].includes(key)
                }
              />
            ))}
          {form.id && (
            <Chips
              value={form.active}
              onChange={(v) => F({ ...form, active: v })}
              options={[
                { label: "Nhận lịch", value: true },
                { label: "Tạm ngừng nhận lịch", value: false },
              ]}
            />
          )}
          <Button
            title="Lưu cấu hình"
            disabled={task.busy}
            onPress={() =>
              task.run(async () => {
                await api(
                  "/garages" + (form.id ? "/" + form.id : ""),
                  form.id ? "PATCH" : "POST",
                  form,
                );
                F(null);
                await q.reload();
              })
            }
          />
          <Button title="Đóng" secondary onPress={() => F(null)} />
        </Card>
      )}
      {(q.data || []).map((g: any) => (
        <Card key={g.id}>
          <Heading>{g.name}</Heading>
          <Body>{g.address}</Body>
          <Body>
            {g.open_hour}:00–{g.close_hour}:00 · {g.capacity} xe đồng thời
          </Body>
          <Body>
            Hủy trước {g.cancel_hours} giờ · Nhắc trước {g.reminder_hours} giờ
          </Body>
          <Body>{g.active ? "Đang nhận lịch" : "Tạm ngừng nhận lịch"}</Body>
          <Button title="Sửa cấu hình" secondary onPress={() => F({ ...g })} />
        </Card>
      ))}
    </Screen>
  );
}
