import { Redirect, router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Button,
  Card,
  colors,
  ErrorText,
  Feedback,
  Field,
  s,
  useSubmit,
} from "../components/ui";
import { useSession } from "../hooks/session";
import { api } from "../services/api";
export default function Login() {
  const session = useSession();
  const [register, R] = useState(false),
    [name, N] = useState(""),
    [email, E] = useState(""),
    [password, P] = useState("");
  const task = useSubmit();
  if (session.loading) return <ActivityIndicator style={{ flex: 1 }} />;
  if (session.user) return <Redirect href="/home" />;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={s.page}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={s.brand}>↗ AutoCare</Text>
          <View style={s.hero}>
            <Text style={s.heroTitle}>Chăm xe của bạn, theo cách của bạn.</Text>
            <Text style={s.heroText}>
              Lịch bảo dưỡng, số km và chi phí — lưu theo tài khoản, đồng hành
              trên mọi điện thoại.
            </Text>
          </View>
          <Card>
            <Text style={s.title}>
              {register ? "Tạo tài khoản" : "Chào mừng trở lại"}
            </Text>
            {register && (
              <Field
                label="Họ và tên"
                placeholder="Ví dụ: Nguyễn Văn An"
                value={name}
                onChange={N}
              />
            )}
            <Field
              label="Email"
              placeholder="Ví dụ: ban@example.com"
              value={email}
              onChange={E}
              email
            />
            <Field
              label="Mật khẩu"
              placeholder={
                register ? "Ít nhất 8 ký tự" : "Nhập mật khẩu của bạn"
              }
              value={password}
              onChange={P}
              secret
            />
            <Feedback task={task} />
            <ErrorText text={session.startupError} />
            <Button
              title={register ? "Đăng ký" : "Đăng nhập"}
              disabled={task.busy}
              onPress={() =>
                task.run(async () => {
                  const data = await api(
                    "/auth/" + (register ? "register" : "login"),
                    "POST",
                    register
                      ? { name, email, password }
                      : { identifier: email, password },
                  );
                  await session.login(data);
                  router.replace("/home");
                }, "")
              }
            />
            <Button
              title={
                register
                  ? "Đã có tài khoản? Đăng nhập"
                  : "Chưa có tài khoản? Đăng ký"
              }
              secondary
              onPress={() => R(!register)}
            />
            {!register && (
              <Button
                title="Quên mật khẩu?"
                secondary
                onPress={() => router.push("/forgot-password")}
              />
            )}
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
