import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Body,
  BrandMark,
  Button,
  Card,
  colors,
  Feedback,
  Field,
  s,
  useSubmit,
} from "../components/ui";
import { api } from "../services/api";
export default function Forgot() {
  const [email, E] = useState("");
  const task = useSubmit();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={s.page}
        keyboardShouldPersistTaps="handled"
      >
        <BrandMark />
        <Card>
          <Text style={s.title}>Quên mật khẩu</Text>
          <Body>Nhập email đã đăng ký để nhận mã khôi phục có thời hạn.</Body>
          <Field
            label="Email khôi phục"
            placeholder="Ví dụ: ban@example.com"
            value={email}
            onChange={E}
            email
          />
          <Button
            title="Gửi hướng dẫn khôi phục"
            disabled={task.busy}
            onPress={() =>
              task.run(async () => {
                const r = await api("/auth/forgot-password", "POST", { email });
                return r;
              }, "Nếu email đã được đăng ký, hướng dẫn khôi phục sẽ được gửi đến email đó.")
            }
          />
          <Feedback task={task} />
          <Button
            title="Tôi đã có mã khôi phục"
            secondary
            onPress={() => router.push("/reset-password")}
          />
          <Button
            title="Về đăng nhập"
            secondary
            onPress={() => router.replace("/login")}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
