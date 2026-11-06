import * as ImagePicker from "expo-image-picker";
import { Redirect, router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "../hooks/session";
export const colors = {
  ink: "#173F35",
  green: "#21604D",
  muted: "#718278",
  bg: "#F3F6F4",
  line: "#DBE6DF",
  lime: "#D7E9AA",
};
export const roles: any = { user: "Người dùng cá nhân" };
export const statuses: any = {
  planned: "Chưa đến hạn",
  soon: "Sắp đến hạn",
  due: "Đến hạn",
  overdue: "Quá hạn",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};
export const money = (n: any) => Number(n || 0).toLocaleString("vi-VN") + " ₫";
export const date = (v: any) =>
  v
    ? new Date(v).toLocaleString("vi-VN", {
        timeZone: "Asia/Bangkok",
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "—";
export function go(path: string) {
  router.push(path as any);
}
export function Screen({
  title,
  subtitle,
  children,
  refresh,
  allowed,
  showBack = true,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  refresh?: () => void;
  allowed?: string[];
  showBack?: boolean;
}) {
  const { user, loading } = useSession();
  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;
  if (!user) return <Redirect href="/login" />;
  if (allowed && !allowed.includes(user.role)) return <Redirect href="/home" />;
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.bg }}
      edges={["top", "bottom"]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={s.header}>
          {showBack ? (
            <Pressable
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace("/home")
              }
              accessibilityLabel="Quay lại"
              accessibilityRole="button"
            >
              <Text style={s.back}>‹</Text>
            </Pressable>
          ) : (
            <View style={{ width: 20 }} />
          )}
          <Pressable onPress={() => router.replace("/home")}>
            <Text style={s.brand}>↗ AutoCare</Text>
          </Pressable>
          <Pressable onPress={() => go("/notifications")}>
            <Text style={s.smallLink}>Thông báo</Text>
          </Pressable>
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          overScrollMode="never"
          bounces={false}
          refreshControl={
            refresh ? (
              <RefreshControl refreshing={false} onRefresh={refresh} />
            ) : undefined
          }
          contentContainerStyle={s.page}
        >
          <Text style={s.title}>{title}</Text>
          {subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
          {children}
          <Text style={s.footer}>
            AUTOCARE · {roles[user.role]?.toUpperCase()}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function Card({ children }: { children: React.ReactNode }) {
  return <View style={s.card}>{children}</View>;
}
export function Heading({ children }: { children: React.ReactNode }) {
  return <Text style={s.heading}>{children}</Text>;
}
export function Body({ children }: { children: React.ReactNode }) {
  return <Text style={s.body}>{children}</Text>;
}
export function ErrorText({ text }: { text?: string }) {
  return text ? (
    <Text accessibilityRole="alert" style={s.error}>
      {text}
    </Text>
  ) : null;
}
export function Empty({ text = "Chưa có dữ liệu." }: { text?: string }) {
  return (
    <Card>
      <Body>{text}</Body>
    </Card>
  );
}
export function Field({
  label,
  value,
  onChange,
  secret = false,
  numeric = false,
  multiline = false,
  placeholder = "",
  email = false,
}: {
  label: string;
  value: any;
  onChange: (v: string) => void;
  secret?: boolean;
  numeric?: boolean;
  multiline?: boolean;
  placeholder?: string;
  email?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={s.label}>{label}</Text>
      <View style={s.inputRow}>
        <TextInput
          accessibilityLabel={label}
          style={[
            s.input,
            multiline && { minHeight: 86, textAlignVertical: "top" },
          ]}
          value={String(value ?? "")}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="#8B9992"
          secureTextEntry={secret && !show}
          autoCapitalize={email || secret ? "none" : "sentences"}
          autoCorrect={!email && !secret}
          keyboardType={
            numeric ? "number-pad" : email ? "email-address" : "default"
          }
          multiline={multiline}
        />
        {secret && (
          <Pressable onPress={() => setShow(!show)} style={{ padding: 14 }}>
            <Text style={s.smallLink}>{show ? "Ẩn" : "Hiện"}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
export function Button({
  title,
  onPress,
  secondary = false,
  danger = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void | Promise<any>;
  secondary?: boolean;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      accessibilityRole="button"
      style={[
        s.button,
        secondary && s.secondary,
        danger && { backgroundColor: "#A8443E" },
        disabled && { opacity: 0.45 },
      ]}
      onPress={onPress}
    >
      <Text style={[s.buttonText, secondary && { color: colors.green }]}>
        {title}
      </Text>
    </Pressable>
  );
}
export function Chips({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: any }[];
  value: any;
  onChange: (v: any) => void;
}) {
  return (
    <View style={s.chips}>
      {options.map((o) => (
        <Pressable
          accessibilityRole="button"
          key={String(o.value)}
          onPress={() => onChange(o.value)}
          style={[s.chip, value === o.value && s.selected]}
        >
          <Text
            style={{
              color: value === o.value ? "white" : colors.ink,
              fontSize: 13,
            }}
          >
            {o.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
export function Badge({ status }: { status: string }) {
  return (
    <View style={s.badge}>
      <Text style={{ color: colors.green, fontWeight: "600", fontSize: 12 }}>
        {statuses[status] || status}
      </Text>
    </View>
  );
}
export function useSubmit() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  const run = async (
    fn: () => Promise<any>,
    message = "Đã lưu thành công.",
  ) => {
    if (busy) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await fn();
      setSuccess(message);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, success, run };
}
export function Feedback({ task }: { task: ReturnType<typeof useSubmit> }) {
  return (
    <>
      <ErrorText text={task.error} />
      {!!task.success && <Text style={s.success}>{task.success}</Text>}
      {task.busy && <ActivityIndicator style={{ margin: 12 }} />}
    </>
  );
}
export async function pickPhoto(camera = false) {
  if (camera) {
    const p = await ImagePicker.requestCameraPermissionsAsync();
    if (!p.granted) throw new Error("Cần cho phép camera để chụp ảnh.");
  }
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ["images"],
    base64: true,
    quality: 0.35,
    allowsEditing: true,
  };
  const result = camera
    ? await ImagePicker.launchCameraAsync(options)
    : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled) return null;
  const a = result.assets[0];
  if (!a.base64) throw new Error("Không đọc được ảnh.");
  if (a.base64.length > 2800000)
    throw new Error("Ảnh quá lớn. Chọn ảnh nhỏ hơn 2 MB.");
  return `data:image/jpeg;base64,${a.base64}`;
}
export async function pickMaintenancePhotos(camera = false): Promise<string[]> {
  if (camera) {
    const photo = await pickPhoto(true);
    return photo ? [photo] : [];
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: true,
    selectionLimit: 10,
    allowsEditing: false,
    base64: true,
    quality: 0.35,
  });
  if (result.canceled) return [];
  return result.assets.map((asset) => {
    if (!asset.base64)
      throw new Error("Không đọc được ảnh. Vui lòng chọn lại.");
    if (asset.base64.length > 2800000)
      throw new Error("Ảnh quá lớn. Vui lòng chọn ảnh có dung lượng nhỏ hơn.");
    return `data:image/jpeg;base64,${asset.base64}`;
  });
}
export function Photo({ uri }: { uri: string }) {
  return (
    <Image
      source={{ uri }}
      style={{ height: 190, width: "100%", borderRadius: 14, marginTop: 10 }}
      resizeMode="contain"
    />
  );
}
export function confirm(title: string, action: () => void) {
  if (Platform.OS === "web") {
    if (globalThis.confirm(title)) action();
    return;
  }
  Alert.alert("Xác nhận", title, [
    { text: "Quay lại", style: "cancel" },
    { text: "Đồng ý", onPress: action },
  ]);
}
export const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  back: { fontSize: 32, color: colors.ink },
  brand: { fontSize: 22, fontWeight: "800", color: colors.ink },
  smallLink: { color: colors.green, fontSize: 13, fontWeight: "600" },
  page: {
    padding: 20,
    paddingBottom: 30,
    width: "100%",
    maxWidth: 650,
    alignSelf: "center",
    gap: 14,
  },
  title: { fontSize: 29, fontWeight: "800", color: colors.ink, marginTop: 8 },
  subtitle: { fontSize: 14, lineHeight: 22, color: colors.muted },
  card: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 8,
  },
  heading: {
    fontSize: 18,
    lineHeight: 25,
    fontWeight: "700",
    color: colors.ink,
  },
  body: { fontSize: 14, lineHeight: 22, color: "#52695E" },
  label: {
    color: colors.ink,
    fontWeight: "600",
    fontSize: 13,
    marginBottom: 7,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    backgroundColor: "#FAFCFA",
  },
  input: { flex: 1, padding: 14, fontSize: 16, color: colors.ink },
  button: {
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: colors.green,
    marginTop: 8,
  },
  secondary: {
    backgroundColor: "#EEF4EF",
    borderWidth: 1,
    borderColor: colors.line,
  },
  buttonText: { fontSize: 14, fontWeight: "700", color: "white" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 8 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 13,
    borderRadius: 10,
    backgroundColor: "#EDF2EE",
  },
  selected: { backgroundColor: colors.green },
  badge: {
    backgroundColor: "#E7F2E8",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  error: { color: "#AB3D39", lineHeight: 21, marginVertical: 8 },
  success: { color: colors.green, lineHeight: 21, marginVertical: 8 },
  footer: {
    fontSize: 10,
    letterSpacing: 1,
    color: colors.muted,
    textAlign: "center",
    marginTop: 20,
  },
  hero: { backgroundColor: colors.ink, borderRadius: 22, padding: 24, gap: 10 },
  heroTitle: {
    fontSize: 27,
    fontWeight: "700",
    color: "#F2F8E7",
    lineHeight: 36,
  },
  heroText: { color: "#C5D7C8", fontSize: 14, lineHeight: 22 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: {
    width: "48%",
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    padding: 18,
    minHeight: 100,
    justifyContent: "space-between",
  },
});
