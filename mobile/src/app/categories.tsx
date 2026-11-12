import { useState } from "react";
import {
  Body,
  Button,
  Card,
  confirm,
  ErrorText,
  Feedback,
  Field,
  Heading,
  Screen,
  useSubmit,
} from "../components/ui";
import { useData } from "../hooks/data";
import { api } from "../services/api";
export default function Categories() {
  const q = useData("/categories");
  const [edit, E] = useState<any>(null),
    [name, N] = useState("");
  const task = useSubmit();
  return (
    <Screen title="Hạng mục bảo dưỡng" refresh={q.reload}>
      <ErrorText text={q.error} />
      <Card>
        <Heading>{edit ? "Sửa hạng mục" : "Thêm hạng mục"}</Heading>
        <Field
          label="Tên hạng mục"
          placeholder="Ví dụ: Thay dầu động cơ, kiểm tra phanh"
          value={name}
          onChange={N}
        />
        <Button
          title="Lưu hạng mục"
          disabled={task.busy}
          onPress={() =>
            task.run(async () => {
              await api(
                "/categories" + (edit ? "/" + edit.id : ""),
                edit ? "PATCH" : "POST",
                { name, active: edit?.active ?? true },
              );
              E(null);
              N("");
              await q.reload();
            })
          }
        />
        {edit && (
          <Button
            title="Hủy sửa"
            secondary
            onPress={() => {
              E(null);
              N("");
            }}
          />
        )}
        <Feedback task={task} />
      </Card>
      {(q.data || []).map((c: any) => (
        <Card key={c.id}>
          <Heading>{c.name}</Heading>
          <Body>{c.active ? "Đang sử dụng" : "Đã ngừng sử dụng"}</Body>
          <Button
            title="Sửa tên hạng mục"
            secondary
            onPress={() => {
              E(c);
              N(c.name);
            }}
          />
          <Button
            title={c.active ? "Ngừng sử dụng" : "Sử dụng lại"}
            secondary
            disabled={task.busy}
            onPress={() =>
              task.run(async () => {
                await api("/categories/" + c.id, "PATCH", {
                  name: c.name,
                  active: !c.active,
                });
                await q.reload();
              })
            }
          />
          <Button
            title="Xóa hạng mục"
            danger
            disabled={task.busy}
            onPress={() =>
              confirm(
                "Xóa hạng mục này?",
                () =>
                  void task.run(async () => {
                    await api("/categories/" + c.id, "DELETE");
                    await q.reload();
                  }),
              )
            }
          />
        </Card>
      ))}
    </Screen>
  );
}
