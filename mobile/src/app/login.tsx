import { Redirect, router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  BrandMark,
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
import {
  readRememberedAccount,
  rememberAccount,
} from "../services/remembered-account";
export default function Login() {
  const session = useSession();
  const [register, R] = useState(false),
    [name, N] = useState(""),
    [email, E] = useState(""),
    [password, P] = useState("");
  const [remember, setRemember] = useState(false);
  const [accountLoading, setAccountLoading] = useState(true);
  useEffect(() => {
    let active = true;
    readRememberedAccount()
      .then((saved) => {
        if (active && saved) {
          E(saved);
          setRemember(true);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setAccountLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  const task = useSubmit();
  if (session.loading || accountLoading)
    return <ActivityIndicator style={{ flex: 1 }} />;
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
          <BrandMark />
          <View style={s.hero}>
            <Text style={s.heroTitle}>Chăm xe của bạn, theo cách của bạn.</Text>
            <Text style={s.heroText}>
              Quản lý lịch bảo dưỡng, theo dõi chi phí và nhắc bạn chăm xe đúng
              lúc.
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
              autoComplete="username"
            />
            <Field
              label="Mật khẩu"
              placeholder={
                register ? "Ít nhất 8 ký tự" : "Nhập mật khẩu của bạn"
              }
              value={password}
              onChange={P}
              secret
              autoComplete={register ? "new-password" : "current-password"}
            />
            <Pressable
              accessibilityRole="checkbox"
              aria-checked={remember}
              accessibilityLabel="Ghi nhớ tài khoản"
              accessibilityHint="Tự điền email trong lần đăng nhập sau"
              accessibilityState={{ checked: remember, disabled: task.busy }}
              disabled={task.busy}
              onPress={() => setRemember(!remember)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                minHeight: 48,
                paddingVertical: 8,
              }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 5,
                  borderWidth: 1.5,
                  borderColor: colors.green,
                  backgroundColor: remember ? colors.green : "white",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                {remember && (
                  <Text style={{ color: "white", fontWeight: "700" }}>✓</Text>
                )}
              </View>
              <Text style={{ color: colors.ink, fontSize: 14, flexShrink: 1 }}>
                Ghi nhớ tài khoản
              </Text>
            </Pressable>
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
                  let rememberFailed = false;
                  try {
                    await rememberAccount(remember ? data.user.email : null);
                  } catch {
                    rememberFailed = true;
                  }
                  await session.login(data);
                  router.replace("/home");
                  if (rememberFailed) {
                    const message =
                      "Bạn đã đăng nhập, nhưng chưa lưu được email trên thiết bị này. Lần sau bạn cần nhập lại email.";
                    if (Platform.OS === "web") window.alert(message);
                    else Alert.alert("Chưa ghi nhớ được tài khoản", message);
                  }
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
