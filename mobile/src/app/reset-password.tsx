import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Body,
  Button,
  Card,
  colors,
  Feedback,
  Field,
  s,
  useSubmit,
} from "../components/ui";
import { api } from "../services/api";
export default function Reset() {
  const params = useLocalSearchParams();
  const [token, T] = useState(String(params.token || "")),
    [password, P] = useState(""),
    [repeat, R] = useState("");
  const task = useSubmit();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={s.page}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={s.brand}>↗ AutoCare</Text>
        <Card>
          <Text style={s.title}>Đặt lại mật khẩu</Text>
          <Body>
            Mã dùng một lần, có hiệu lực trong 15 phút. Sau khi đổi, các phiên
            cũ sẽ kết thúc.
          </Body>
          <Field
            label="Mã khôi phục"
            placeholder="Dán mã nhận được trong email khôi phục"
            value={token}
            onChange={T}
          />
          <Field
            label="Mật khẩu mới"
            placeholder="Ít nhất 8 ký tự"
            value={password}
            onChange={P}
            secret
          />
          <Field
            label="Nhập lại mật khẩu mới"
            placeholder="Nhập lại mật khẩu vừa đặt"
            value={repeat}
            onChange={R}
            secret
          />
          <Feedback task={task} />
          <Button
            title="Đặt lại mật khẩu"
            disabled={task.busy}
            onPress={() =>
              task.run(async () => {
                if (password !== repeat) throw Error("Hai mật khẩu chưa khớp.");
                await api("/auth/reset-password", "POST", { token, password });
              }, "Đã đặt lại mật khẩu. Bạn có thể đăng nhập bằng mật khẩu mới.")
            }
          />
          <Button
            title="Về đăng nhập"
            secondary
            disabled={task.busy}
            onPress={() => router.replace("/login")}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
