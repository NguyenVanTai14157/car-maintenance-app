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
  money,
  Chips,
} from "../components/ui";
import { useData } from "../hooks/data";
import { useSession } from "../hooks/session";
import { api } from "../services/api";
export default function Services() {
  const q = useData("/services"),
    { user } = useSession(),
    task = useSubmit();
  const [form, F] = useState<any>(null);
  return (
    <Screen
      title="Dịch vụ & bảng giá"
      subtitle="Giá và thời gian dự kiến. Phát sinh chỉ được tính khi khách đồng ý."
      refresh={q.reload}
    >
      <ErrorText text={q.error} />
      {user?.role === "admin" && (
        <Button
          title="＋ Thêm dịch vụ"
          onPress={() =>
            F({
              name: "",
              description: "",
              price: "",
              duration: "60",
              checklistText:
                "Kiểm tra trước bảo dưỡng\nThực hiện dịch vụ\nKiểm tra sau bảo dưỡng",
              active: true,
            })
          }
        />
      )}
      <Feedback task={task} />
      {form && (
        <Card>
          <Heading>{form.id ? "Sửa dịch vụ" : "Dịch vụ mới"}</Heading>
          {[
            ["name", "Tên dịch vụ"],
            ["description", "Mô tả"],
            ["price", "Giá (VNĐ)"],
            ["duration", "Thời gian (phút)"],
            ["checklistText", "Checklist — mỗi dòng một hạng mục"],
          ].map(([key, label]) => (
            <Field
              key={key}
              label={label}
              value={form[key]}
              onChange={(v) => F({ ...form, [key]: v })}
              multiline={["description", "checklistText"].includes(key)}
              numeric={["price", "duration"].includes(key)}
            />
          ))}
          <Chips
            value={form.active}
            onChange={(v) => F({ ...form, active: v })}
            options={[
              { label: "Đang cung cấp", value: true },
              { label: "Ngừng cung cấp", value: false },
            ]}
          />
          <Button
            title="Lưu dịch vụ"
            disabled={task.busy}
            onPress={() =>
              task.run(async () => {
                await api(
                  "/services" + (form.id ? "/" + form.id : ""),
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
      {(q.data || []).map((v: any) => (
        <Card key={v.id}>
          <Heading>
            {v.name}
            {!v.active ? " · Ngừng cung cấp" : ""}
          </Heading>
          <Body>{v.description}</Body>
          <Heading>{money(v.price)}</Heading>
          <Body>Thời gian dự kiến: {v.duration} phút</Body>
          {v.checklist.map((c: string, i: number) => (
            <Body key={i}>• {c}</Body>
          ))}
          {user?.role === "admin" && (
            <Button
              title="Sửa bảng giá / dịch vụ"
              secondary
              onPress={() => F({ ...v, checklistText: v.checklist.join("\n") })}
            />
          )}
        </Card>
      ))}
    </Screen>
  );
}
