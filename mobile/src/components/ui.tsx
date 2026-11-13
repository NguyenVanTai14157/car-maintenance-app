import * as ImagePicker from "expo-image-picker";
import { Redirect, router, usePathname } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "../hooks/session";
import { normalizeIntegerInput } from "./number-values";
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
export function BrandMark() {
  return (
    <View style={s.brandMark}>
      <Image
        source={require("../../assets/company-logo.png")}
        style={s.brandLogo}
        resizeMode="contain"
        accessible={false}
      />
      <Text style={s.brand} numberOfLines={1} adjustsFontSizeToFit>
        Htsofttechcare
      </Text>
    </View>
  );
}
export function Screen({
  title,
  subtitle,
  children,
  refresh,
  allowed,
  showBack = true,
  wide = false,
  onBack,
  planCount,
  showBottomNav,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  refresh?: () => void;
  allowed?: string[];
  showBack?: boolean;
  wide?: boolean;
  onBack?: () => void;
  planCount?: number;
  showBottomNav?: boolean;
}) {
  const { user, loading } = useSession();
  const pathname = usePathname();
  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;
  if (!user) return <Redirect href="/login" />;
  if (allowed && !allowed.includes(user.role)) return <Redirect href="/home" />;
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.bg }}
      edges={["top", "bottom"]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1, minHeight: 0 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={s.header}>
          {showBack ? (
            <Pressable
              onPress={
                onBack ||
                (() =>
                  router.canGoBack() ? router.back() : router.replace("/home"))
              }
              accessibilityLabel="Quay lại"
              accessibilityRole="button"
            >
              <Text style={s.back}>‹</Text>
            </Pressable>
          ) : (
            <View style={{ width: 20 }} />
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Htsofttechcare, về trang chủ"
            onPress={() => router.replace("/home")}
            style={{ flexShrink: 1, marginHorizontal: 8 }}
          >
            <BrandMark />
          </Pressable>
          <Pressable onPress={() => go("/notifications")}>
            <Text style={s.smallLink}>Thông báo</Text>
          </Pressable>
        </View>
        <ScrollView
          style={{ flex: 1, minHeight: 0 }}
          keyboardShouldPersistTaps="handled"
          overScrollMode="never"
          bounces={false}
          refreshControl={
            refresh ? (
              <RefreshControl refreshing={false} onRefresh={refresh} />
            ) : undefined
          }
          contentContainerStyle={[s.page, wide && { maxWidth: 1000 }]}
        >
          <Text style={s.title}>{title}</Text>
          {subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
          {children}
          <Text style={s.footer}>
            Htsofttechcare · {roles[user.role]?.toUpperCase()}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
      {(showBottomNav ?? (!onBack && mainNavPaths.has(pathname))) && (
        <BottomNavigation pathname={pathname} planCount={planCount} />
      )}
    </SafeAreaView>
  );
}

const primaryNav = [
  { path: "/home", label: "Trang chủ", icon: require("../../assets/navigation/home.png") },
  { path: "/vehicles", label: "Xe của tôi", icon: require("../../assets/navigation/car.png") },
  { path: "/plans", label: "Lịch", icon: require("../../assets/navigation/calendar.png") },
  { path: "/records", label: "Lịch sử", icon: require("../../assets/navigation/history.png") },
] as const;

const moreNav = [
  { path: "/record-edit", label: "Thêm lần bảo dưỡng" },
  { path: "/categories", label: "Hạng mục" },
  { path: "/costs", label: "Chi phí" },
  { path: "/settings", label: "Cài đặt" },
  { path: "/profile", label: "Tài khoản" },
] as const;

const mainNavPaths = new Set<string>([
  ...primaryNav.map(({ path }) => path),
  ...moreNav.filter(({ path }) => path !== "/record-edit").map(({ path }) => path),
]);

function BottomNavigation({
  pathname,
  planCount,
}: {
  pathname: string;
  planCount?: number;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const closeMore = () => setMoreOpen(false);
  const moreSelected = moreNav.some(({ path }) => path === pathname);

  return (
    <View style={bottomNav.bar}>
      <View style={bottomNav.row}>
        {primaryNav.map(({ path, label, icon }) => {
          const selected = pathname === path;
          const hasCount = path === "/plans" && !!planCount;
          return (
            <Pressable
              key={path}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={hasCount ? `Lịch bảo dưỡng, ${planCount} lịch đang theo dõi` : path === "/plans" ? "Lịch bảo dưỡng" : label}
              style={[bottomNav.tab, selected && bottomNav.selected]}
              onPress={() => { if (!selected) router.navigate(path); }}
            >
              <Image source={icon} style={bottomNav.icon} accessible={false} />
              <Text style={bottomNav.label}>{label}</Text>
              {hasCount && (
                <Text style={bottomNav.badge}>{planCount! > 99 ? "99+" : planCount}</Text>
              )}
            </Pressable>
          );
        })}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Thêm chức năng"
          accessibilityState={{ expanded: moreOpen }}
          style={[bottomNav.tab, moreSelected && bottomNav.selected]}
          onPress={() => setMoreOpen(true)}
        >
          <Image
            source={require("../../assets/navigation/more.png")}
            style={bottomNav.icon}
            accessible={false}
          />
          <Text style={bottomNav.label}>Thêm</Text>
        </Pressable>
      </View>
      <Modal transparent visible={moreOpen} animationType="slide" onRequestClose={closeMore}>
        <View style={bottomNav.overlay}>
          <Pressable
            accessibilityLabel="Đóng danh sách chức năng"
            accessibilityRole="button"
            style={StyleSheet.absoluteFill}
            onPress={closeMore}
          />
          <SafeAreaView edges={["bottom"]} style={bottomNav.sheet}>
            <View style={bottomNav.sheetHeader}>
              <Heading>Thêm chức năng</Heading>
              <Pressable accessibilityRole="button" onPress={closeMore} hitSlop={8}>
                <Text style={bottomNav.label}>Đóng</Text>
              </Pressable>
            </View>
            <ScrollView>
              {moreNav.map(({ path, label }) => (
                <Pressable
                  key={path}
                  accessibilityRole="button"
                  accessibilityState={{ selected: pathname === path }}
                  style={[bottomNav.option, pathname === path && bottomNav.selected]}
                  onPress={() => {
                    closeMore();
                    if (pathname !== path) router.navigate(path);
                  }}
                >
                  <Text style={bottomNav.optionText}>{label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

const bottomNav = StyleSheet.create({
  bar: { flexShrink: 0, backgroundColor: "white", borderTopWidth: 1, borderColor: colors.line },
  row: { flexDirection: "row", width: "100%", maxWidth: 600, alignSelf: "center", padding: 6, gap: 4 },
  tab: { flex: 1, minHeight: 52, alignItems: "center", justifyContent: "center", borderRadius: 12 },
  selected: { backgroundColor: "#E7F2E8" },
  icon: { width: 22, height: 22, tintColor: colors.green },
  label: { color: colors.green, fontSize: 11, fontWeight: "700", textAlign: "center" },
  badge: { position: "absolute", top: 2, right: 2, color: "white", backgroundColor: colors.green, borderRadius: 10, paddingHorizontal: 4, fontSize: 10, fontWeight: "700" },
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15, 34, 28, 0.45)" },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 8, maxHeight: "80%" },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  option: { minHeight: 48, paddingHorizontal: 12, justifyContent: "center", borderRadius: 10 },
  optionText: { color: colors.ink, fontSize: 15, fontWeight: "600" },
});
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
  unit,
  hint,
  phone = false,
  autoComplete,
}: {
  label: string;
  value: any;
  onChange: (v: string) => void;
  secret?: boolean;
  numeric?: boolean;
  multiline?: boolean;
  placeholder?: string;
  email?: boolean;
  unit?: string;
  hint?: string;
  phone?: boolean;
  autoComplete?: TextInputProps["autoComplete"];
}) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={s.label}>{label}</Text>
      <View style={[s.inputRow, focused && { borderColor: colors.green }]}>
        <TextInput
          accessibilityLabel={label}
          accessibilityHint={unit ? `Đơn vị: ${unit}` : hint}
          style={[
            s.input,
            multiline && { minHeight: 86, textAlignVertical: "top" },
          ]}
          value={String(value ?? "")}
          onChangeText={(v) => onChange(numeric ? normalizeIntegerInput(v) : v)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          placeholderTextColor="#8B9992"
          secureTextEntry={secret && !show}
          autoCapitalize={email || secret ? "none" : "sentences"}
          autoCorrect={!email && !secret && !numeric && !phone}
          autoComplete={autoComplete}
          keyboardType={
            numeric
              ? "number-pad"
              : phone
                ? "phone-pad"
                : email
                  ? "email-address"
                  : "default"
          }
          multiline={multiline}
        />
        {!!unit && (
          <Text
            style={{
              color: colors.ink,
              fontSize: 14,
              fontWeight: "600",
              paddingHorizontal: 14,
            }}
          >
            {unit}
          </Text>
        )}
        {secret && (
          <Pressable onPress={() => setShow(!show)} style={{ padding: 14 }}>
            <Text style={s.smallLink}>{show ? "Ẩn" : "Hiện"}</Text>
          </Pressable>
        )}
      </View>
      {!!hint && <Text style={s.hint}>{hint}</Text>}
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
export function Badge({ status, label }: { status: string; label?: string }) {
  const tone =
    status === "overdue"
      ? { bg: "#FCEAE8", ink: "#A3332B" }
      : status === "due" || status === "soon"
        ? { bg: "#FFF2D5", ink: "#805600" }
        : { bg: "#E7F2E8", ink: colors.green };
  return (
    <View style={[s.badge, { backgroundColor: tone.bg }]}>
      <Text style={{ color: tone.ink, fontWeight: "600", fontSize: 12 }}>
        {label || statuses[status] || status}
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
    allowsEditing: false,
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
export async function pickPhotos(
  camera = false,
  selectionLimit = 10,
): Promise<string[]> {
  if (camera) {
    const photo = await pickPhoto(true);
    return photo ? [photo] : [];
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: true,
    selectionLimit,
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
export const pickMaintenancePhotos = pickPhotos;
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
  brandMark: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandLogo: { width: 29, height: 34, borderRadius: 5 },
  brand: {
    flexShrink: 1,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.35,
    color: "#173B55",
  },
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
  input: { flex: 1, minWidth: 0, padding: 14, fontSize: 16, color: colors.ink },
  hint: { fontSize: 12, lineHeight: 18, color: colors.muted, marginTop: 6 },
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
    maxWidth: "100%",
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
