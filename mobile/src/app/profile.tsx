import React, { useState } from "react";
import { router } from "expo-router";
import {
  Screen,
  Card,
  Heading,
  Field,
  Button,
  Feedback,
  useSubmit,
  Photo,
  pickPhoto,
  roles,
  confirm,
} from "../components/ui";
import { useSession } from "../hooks/session";
import { api } from "../services/api";
export default function Profile() {
  const { user, setUser, logout } = useSession();
  const [form, F] = useState<any>(null),
    [current, C] = useState(""),
    [password, P] = useState("");
  const v = form || user || {};
  const task = useSubmit();
  return (
    <Screen title="Hồ sơ của tôi" subtitle={roles[user?.role]}>
      <Card>
        {v.avatar && <Photo uri={v.avatar} />}
        <Button
          title="Chọn ảnh đại diện"
          secondary
          disabled={task.busy}
          onPress={() =>
            task.run(async () => {
              const avatar = await pickPhoto();
              if (avatar) F({ ...v, avatar });
            }, "Ảnh sẽ được lưu khi bạn bấm Lưu hồ sơ.")
          }
        />
        {[
          ["name", "Họ tên"],
          ["email", "Email"],
          ["phone", "Số điện thoại"],
        ].map(([key, label]) => (
          <Field
            key={key}
            label={label}
            value={v[key]}
            email={key === "email"}
            onChange={(value) => F({ ...v, [key]: value })}
          />
        ))}
        <Button
          title="Lưu hồ sơ"
          disabled={task.busy}
          onPress={() =>
            task.run(async () => {
              const saved = await api("/auth/me", "PATCH", v);
              setUser(saved);
              F(null);
            })
          }
        />
      </Card>
      <Card>
        <Heading>Đổi mật khẩu</Heading>
        <Field label="Mật khẩu hiện tại" value={current} onChange={C} secret />
        <Field label="Mật khẩu mới" value={password} onChange={P} secret />
        <Button
          title="Đổi mật khẩu"
          disabled={task.busy}
          onPress={() =>
            task.run(async () => {
              await api("/auth/password", "POST", { current, password });
              C("");
              P("");
            })
          }
        />
      </Card>
      <Feedback task={task} />
      <Button
        title="Đăng xuất"
        danger
        disabled={task.busy}
        onPress={() =>
          confirm(
            "Đăng xuất khỏi tài khoản?",
            () =>
              void task.run(async () => {
                await logout();
                router.replace("/login");
              }, ""),
          )
        }
      />
    </Screen>
  );
}
