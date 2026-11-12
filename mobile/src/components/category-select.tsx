import { useState } from "react";
import { api } from "../services/api";
import { Select } from "./personal";
import { Body, Button, Card, Feedback, Field, Heading, useSubmit } from "./ui";

export function CategorySelect({
  label = "Hạng mục",
  value,
  onChange,
  items,
  refresh,
}: {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  items: { id: number; name: string }[];
  refresh: () => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const task = useSubmit();
  return (
    <>
      <Select label={label} value={value} onChange={onChange} items={items} />
      {!adding ? (
        <Button
          title="+ Thêm hạng mục"
          secondary
          onPress={() => setAdding(true)}
        />
      ) : (
        <Card>
          <Heading>Thêm hạng mục của bạn</Heading>
          <Body>
            Hạng mục mới sẽ được lưu và chọn ngay, các thông tin bạn đang nhập
            vẫn được giữ.
          </Body>
          <Field
            label="Tên hạng mục mới"
            placeholder="Ví dụ: Thay ắc quy, vệ sinh điều hòa"
            value={name}
            onChange={setName}
          />
          <Feedback task={task} />
          <Button
            title={task.busy ? "Đang lưu hạng mục…" : "Lưu và chọn hạng mục"}
            disabled={task.busy}
            onPress={() =>
              task.run(async () => {
                const trimmed = name.trim();
                if (!trimmed) throw new Error("Vui lòng nhập tên hạng mục.");
                const item = await api("/categories", "POST", {
                  name: trimmed,
                  active: true,
                });
                await refresh();
                onChange(item.id);
                setName("");
                setAdding(false);
              }, "")
            }
          />
          <Button
            title="Hủy thêm hạng mục"
            secondary
            disabled={task.busy}
            onPress={() => setAdding(false)}
          />
        </Card>
      )}
    </>
  );
}
