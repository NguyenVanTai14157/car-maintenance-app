import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
const developmentHost =
  Platform.OS === "web"
    ? globalThis.location?.hostname
    : Constants.expoConfig?.hostUri?.split(":")[0];
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  `http://${developmentHost || "10.0.2.2"}:3000`;
let token: string | null = null;
let refreshToken: string | null = null;
let refreshPending: Promise<void> | undefined;
let sessionVersion = 0;
let expired: (() => void) | undefined;
export const getToken = () => token;
export function expireSession() {
  expired?.();
}
export function onExpired(fn: () => void) {
  expired = fn;
}
export async function restoreToken() {
  token =
    Platform.OS === "web"
      ? sessionStorage.getItem("autocare.session")
      : await SecureStore.getItemAsync("autocare.session");
  refreshToken =
    Platform.OS === "web"
      ? sessionStorage.getItem("autocare.refresh")
      : await SecureStore.getItemAsync("autocare.refresh");
  return token || refreshToken;
}
export async function saveToken(
  value: string | null,
  refresh: string | null = null,
) {
  sessionVersion++;
  token = value;
  refreshToken = value ? refresh : null;
  if (Platform.OS === "web") {
    if (refreshToken) sessionStorage.setItem("autocare.refresh", refreshToken);
    else sessionStorage.removeItem("autocare.refresh");
    if (value) sessionStorage.setItem("autocare.session", value);
    else sessionStorage.removeItem("autocare.session");
    return;
  }
  if (refreshToken)
    await SecureStore.setItemAsync("autocare.refresh", refreshToken);
  else await SecureStore.deleteItemAsync("autocare.refresh");
  if (value) await SecureStore.setItemAsync("autocare.session", value);
  else await SecureStore.deleteItemAsync("autocare.session");
}
export function refreshAccessToken(): Promise<void> {
  if (refreshPending) return refreshPending;
  const version = sessionVersion;
  const pending = (async () => {
    if (!token && !refreshToken) throw new Error("Vui lòng đăng nhập lại.");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(API_URL + "/auth/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(refreshToken ? { refreshToken } : {}),
        signal: controller.signal,
      });
      if (version !== sessionVersion)
        throw new Error("Phiên đăng nhập đã thay đổi.");
      if (response.status === 401) {
        expired?.();
        throw new Error("Phiên đã bị thu hồi. Vui lòng đăng nhập lại.");
      }
      if (!response.ok)
        throw new Error("Chưa thể gia hạn phiên. Vui lòng thử lại.");
      const result = await response.json();
      if (version !== sessionVersion)
        throw new Error("Phiên đăng nhập đã thay đổi.");
      await saveToken(result.accessToken, result.refreshToken);
    } finally {
      clearTimeout(timer);
    }
  })();
  refreshPending = pending;
  void pending
    .finally(() => {
      if (refreshPending === pending) refreshPending = undefined;
    })
    .catch(() => {});
  return pending;
}
export async function api(
  path: string,
  method = "GET",
  body?: unknown,
  retried = false,
): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(API_URL + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await response.json();
    if (
      response.status === 401 &&
      !path.startsWith("/auth/login") &&
      !retried &&
      (refreshToken || token)
    ) {
      await refreshAccessToken();
      return api(path, method, body, true);
    }
    if (!response.ok) {
      if (response.status === 401 && !path.startsWith("/auth/login"))
        expired?.();
      throw new Error(
        Array.isArray(data.message)
          ? data.message.join("\n")
          : data.message || "Không thể xử lý yêu cầu.",
      );
    }
    return data;
  } catch (e: any) {
    if (
      controller.signal.aborted ||
      e.name === "AbortError" ||
      e.message === "Network request failed" ||
      e.message?.startsWith("fetch failed:")
    )
      throw new Error(
        "Chưa kết nối được với Htsofttechcare. Bạn hãy kiểm tra kết nối mạng rồi thử lại.",
      );
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
