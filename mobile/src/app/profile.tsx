import { useState } from "react";
import {
  Button,
  Card,
  confirm,
  Feedback,
  Field,
  Heading,
  Photo,
  pickPhoto,
  Screen,
  useSubmit,
} from "../components/ui";
import { useSession } from "../hooks/session";
import { api } from "../services/api";
export default function Profile() {
  const { user, setUser, logout } = useSession();
  return (
    <Screen title="Tài khoản cá nhân">
      {user && (
        <ProfileForm
          key={user.id}
          user={user}
          setUser={setUser}
          logout={logout}
        />
      )}
    </Screen>
  );
}
function ProfileForm({ user, setUser, logout }: any) {
  const [name, N] = useState(user.name),
    [email, E] = useState(user.email),
    [phone, P] = useState(user.phone || ""),
    [avatar, A] = useState(user.avatar || ""),
    [current, C] = useState(""),
    [password, W] = useState("");
  const info = useSubmit(),
    security = useSubmit(),
    exit = useSubmit();
  const busy = info.busy || security.busy || exit.busy;
  return (
    <>
      <Card>
        <Heading>Thông tin cá nhân</Heading>
        {!!avatar && <Photo uri={avatar} />}
        <Button
          title="Chọn ảnh đại diện"
          secondary
          disabled={busy}
          onPress={() =>
            info.run(async () => {
              const image = await pickPhoto();
              if (image) A(image);
            }, "")
          }
        />
        <Field
          label="Họ và tên"
          placeholder="Ví dụ: Nguyễn Văn An"
          value={name}
          onChange={N}
        />
        <Field
          label="Email"
          placeholder="Ví dụ: ban@example.com"
          value={email}
          onChange={E}
          email
        />
        <Field
          label="Số điện thoại (không bắt buộc)"
          placeholder="Ví dụ: 0901234567"
          value={phone}
          onChange={P}
        />
        <Button
          title="Lưu thông tin"
          disabled={busy}
          onPress={() =>
            info.run(async () =>
              setUser(
                await api("/auth/me", "PATCH", { name, email, phone, avatar }),
              ),
            )
          }
        />
        <Feedback task={info} />
      </Card>
      <Card>
        <Heading>Đổi mật khẩu</Heading>
        <Field
          label="Mật khẩu hiện tại"
          placeholder="Nhập mật khẩu đang sử dụng"
          value={current}
          onChange={C}
          secret
        />
        <Field
          label="Mật khẩu mới"
          placeholder="Ít nhất 8 ký tự"
          value={password}
          onChange={W}
          secret
        />
        <Button
          title="Đổi mật khẩu"
          secondary
          disabled={busy}
          onPress={() =>
            security.run(async () => {
              await api("/auth/password", "POST", { current, password });
              C("");
              W("");
            }, "Đã đổi mật khẩu, các phiên khác đã kết thúc.")
          }
        />
        <Feedback task={security} />
      </Card>
      <Feedback task={exit} />
      <Button
        title="Đăng xuất"
        danger
        disabled={busy}
        onPress={() =>
          confirm(
            "Đăng xuất khỏi thiết bị này?",
            () => void exit.run(logout, ""),
          )
        }
      />
    </>
  );
}
