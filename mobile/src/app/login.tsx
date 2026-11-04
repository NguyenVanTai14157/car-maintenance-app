import React, { useState } from "react";
import {
  ScrollView,
  Text,
  View,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, router } from "expo-router";
import { api } from "../services/api";
import { useSession } from "../hooks/session";
import {
  Card,
  Field,
  Button,
  Feedback,
  useSubmit,
  s,
  colors,
  ErrorText,
} from "../components/ui";
const testAccounts = [
  { name: "Quản trị AutoCare", email: "admin@gmail.com" },
  { name: "Lễ tân AutoCare", email: "receptionist@gmail.com" },
  { name: "Kỹ thuật viên AutoCare", email: "technician@gmail.com" },
  { name: "Khách hàng demo", email: "customer@gmail.com" },
];
const demoPassword = process.env.EXPO_PUBLIC_DEMO_PASSWORD;
export default function Login() {
  const session = useSession();
  const [register, setRegister] = useState(false),
    [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [phone, setPhone] = useState(""),
    [password, setPassword] = useState("");
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
          keyboardShouldPersistTaps="handled"
          overScrollMode="never"
          contentContainerStyle={[s.page, { paddingVertical: 8, gap: 8 }]}
        >
          <Text style={[s.brand, { marginVertical: 2 }]}>↗ AutoCare</Text>
          <View style={[s.hero, { padding: 14, gap: 4 }]}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text style={[s.heroTitle, { fontSize: 20, lineHeight: 26 }]}>
                Mỗi hành trình, thêm an tâm.
              </Text>
              <Text style={{ fontSize: 26 }}>🚘</Text>
            </View>
            <Text style={[s.heroText, { fontSize: 13, lineHeight: 18 }]}>
              Đặt lịch, theo dõi tiến độ và chăm sóc xe cùng gara của bạn.
            </Text>
          </View>
          <Card>
            <Text style={[s.title, { fontSize: 24, marginTop: 0 }]}>
              {register ? "Tạo tài khoản" : "Chào mừng trở lại"}
            </Text>
            <Text style={s.subtitle}>
              {register
                ? "Tài khoản mới dành cho khách hàng."
                : "Đăng nhập để tiếp tục hành trình."}
            </Text>
            {register && (
              <Field label="Họ và tên" value={name} onChange={setName} />
            )}
            <Field
              label={
                register
                  ? "Email (hoặc nhập SĐT bên dưới)"
                  : "Email hoặc số điện thoại"
              }
              value={email}
              onChange={setEmail}
              email
            />
            {register && (
              <Field label="Số điện thoại" value={phone} onChange={setPhone} />
            )}
            <Field
              label="Mật khẩu"
              value={password}
              onChange={setPassword}
              secret
            />
            <Feedback task={task} />
            <ErrorText text={session.startupError} />
            <Button
              title={register ? "Tạo tài khoản" : "Đăng nhập →"}
              disabled={task.busy}
              onPress={() =>
                task.run(async () => {
                  const result = await api(
                    "/auth/" + (register ? "register" : "login"),
                    "POST",
                    register
                      ? { name, email, phone, password }
                      : { identifier: email, password },
                  );
                  await session.login(result);
                  setPassword("");
                  router.replace("/home");
                }, "")
              }
            />
            <Button
              title={
                register
                  ? "Đã có tài khoản? Đăng nhập"
                  : "Chưa có tài khoản? Đăng ký ngay"
              }
              secondary
              onPress={() => setRegister(!register)}
            />
            {!register && demoPassword && (
              <View
                style={{
                  marginTop: 10,
                  paddingTop: 14,
                  borderTopWidth: 1,
                  borderColor: colors.line,
                  gap: 6,
                }}
              >
                <Text style={[s.heading, { fontSize: 15 }]}>
                  Tài khoản kiểm thử
                </Text>
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: colors.line,
                    borderRadius: 12,
                    overflow: "hidden",
                    backgroundColor: "#FAFCFA",
                  }}
                >
                  {testAccounts.map((account, index) => {
                    const selected =
                      email.trim().toLowerCase() === account.email;
                    return (
                      <Pressable
                        key={account.email}
                        accessibilityRole="button"
                        accessibilityLabel={`${account.name} ${account.email}`}
                        disabled={task.busy}
                        onPress={() => {
                          setEmail(account.email);
                          setPassword(demoPassword);
                        }}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          paddingVertical: 10,
                          paddingHorizontal: 14,
                          borderTopWidth: index === 0 ? 0 : 1,
                          borderColor: colors.line,
                          backgroundColor: selected ? "#E7F2E8" : "transparent",
                          gap: 8,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: selected ? "700" : "600",
                            color: selected ? colors.green : colors.ink,
                            flexShrink: 1,
                          }}
                        >
                          {selected ? "● " : ""}
                          {account.name}
                        </Text>
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: selected ? "700" : "500",
                            color: selected ? colors.green : colors.muted,
                          }}
                        >
                          {account.email}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
          </Card>
          <Text style={s.footer}>AUTOCARE · CHĂM XE CHU ĐÁO</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
