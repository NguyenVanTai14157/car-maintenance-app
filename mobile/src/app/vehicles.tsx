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
  Empty,
  go,
} from "../components/ui";
import { useData } from "../hooks/data";
import { useSession } from "../hooks/session";
import { api } from "../services/api";
const fresh = {
  plate: "",
  brand: "",
  model: "",
  year: String(new Date().getFullYear()),
  odometer: "0",
};
export default function Vehicles() {
  const q = useData("/vehicles"),
    { user } = useSession(),
    task = useSubmit();
  const [form, F] = useState<any>(null),
    [search, S] = useState("");
  return (
    <Screen
      title={user?.role === "customer" ? "Xe của tôi" : "Tra cứu phương tiện"}
      allowed={["customer", "admin", "receptionist"]}
      refresh={q.reload}
    >
      <ErrorText text={q.error} />
      <Field
        label="Tìm biển số, hãng hoặc chủ xe"
        value={search}
        onChange={S}
      />
      {user?.role === "customer" && (
        <Button title="＋ Thêm xe" onPress={() => F({ ...fresh })} />
      )}
      <Feedback task={task} />
      {form && (
        <Card>
          <Heading>{form.id ? "Cập nhật xe" : "Thêm xe mới"}</Heading>
          {[
            ["plate", "Biển số"],
            ["brand", "Hãng xe"],
            ["model", "Dòng xe"],
            ["year", "Năm sản xuất"],
            ["odometer", "Số km hiện tại"],
          ].map(([key, label]) => (
            <Field
              key={key}
              label={label}
              value={form[key]}
              onChange={(v) => F({ ...form, [key]: v })}
              numeric={["year", "odometer"].includes(key)}
            />
          ))}
          <Button
            title="Lưu xe"
            disabled={task.busy}
            onPress={() =>
              task.run(async () => {
                await api(
                  "/vehicles" + (form.id ? "/" + form.id : ""),
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
      {(q.data || [])
        .filter((v: any) =>
          `${v.plate} ${v.brand} ${v.model} ${v.owner_name}`
            .toLowerCase()
            .includes(search.toLowerCase()),
        )
        .map((v: any) => (
          <Card key={v.id}>
            <Heading>{v.plate}</Heading>
            <Body>
              {v.brand} {v.model} · {v.year}
            </Body>
            <Body>
              {Number(v.odometer).toLocaleString("vi-VN")} km · {v.owner_name}
            </Body>
            {user?.role === "customer" && (
              <Button
                title="Cập nhật thông tin / số km"
                secondary
                onPress={() => F({ ...v })}
              />
            )}
            <Button
              title="Lịch sử bảo dưỡng của xe"
              secondary
              onPress={() => go("/appointments?vehicle=" + v.id)}
            />
          </Card>
        ))}
      {q.data?.length === 0 && (
        <Empty text="Chưa có xe. Thêm chiếc xe đầu tiên để đặt lịch." />
      )}
    </Screen>
  );
}
