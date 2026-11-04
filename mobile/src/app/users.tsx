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
  roles,
} from "../components/ui";
import { useData } from "../hooks/data";
import { api } from "../services/api";
export default function Users() {
  const q = useData("/users"),
    task = useSubmit();
  const [form, F] = useState<any>(null),
    [search, S] = useState(""),
    [filter, Filter] = useState("all");
  return (
    <Screen
      title="Tài khoản & phân quyền"
      allowed={["admin"]}
      refresh={q.reload}
    >
      <Field label="Tìm tên, email hoặc SĐT" value={search} onChange={S} />
      <Chips
        value={filter}
        onChange={Filter}
        options={[
          { label: "Tất cả", value: "all" },
          ...Object.entries(roles).map(([value, label]) => ({
            value,
            label: String(label),
          })),
        ]}
      />
      <Button
        title="＋ Cấp tài khoản nhân viên"
        onPress={() =>
          F({
            name: "",
            email: "",
            phone: "",
            password: "",
            role: "receptionist",
            active: true,
          })
        }
      />
      <ErrorText text={q.error} />
      <Feedback task={task} />
      {form && (
        <Card>
          <Heading>{form.id ? "Sửa tài khoản" : "Nhân viên mới"}</Heading>
          {[
            ["name", "Họ tên"],
            ["email", "Email"],
            ["phone", "Số điện thoại"],
            ...(!form.id ? [["password", "Mật khẩu ban đầu"]] : []),
          ].map(([key, label]) => (
            <Field
              key={key}
              label={label}
              value={form[key]}
              secret={key === "password"}
              email={key === "email"}
              onChange={(v) => F({ ...form, [key]: v })}
            />
          ))}
          <Chips
            value={form.role}
            onChange={(v) => F({ ...form, role: v })}
            options={Object.entries(roles)
              .filter(([k]) => form.id || k !== "customer")
              .map(([value, label]) => ({ value, label: String(label) }))}
          />
          <Chips
            value={form.active}
            onChange={(v) => F({ ...form, active: v })}
            options={[
              { label: "Hoạt động", value: true },
              { label: "Khóa", value: false },
            ]}
          />
          <Button
            title="Lưu tài khoản"
            disabled={task.busy}
            onPress={() =>
              task.run(async () => {
                await api(
                  "/users" + (form.id ? "/" + form.id : ""),
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
        .filter(
          (v: any) =>
            (filter === "all" || v.role === filter) &&
            `${v.name} ${v.email} ${v.phone}`
              .toLowerCase()
              .includes(search.toLowerCase()),
        )
        .map((v: any) => (
          <Card key={v.id}>
            <Heading>{v.name}</Heading>
            <Body>
              {roles[v.role]} · {v.active ? "Hoạt động" : "Đã khóa"}
            </Body>
            <Body>{v.email || v.phone}</Body>
            <Button
              title="Sửa / phân quyền / khóa"
              secondary
              onPress={() => F({ ...v })}
            />
          </Card>
        ))}
    </Screen>
  );
}
