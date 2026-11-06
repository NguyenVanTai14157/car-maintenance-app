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
  return token;
}
export async function saveToken(value: string | null) {
  token = value;
  if (Platform.OS === "web") {
    if (value) sessionStorage.setItem("autocare.session", value);
    else sessionStorage.removeItem("autocare.session");
    return;
  }
  if (value) await SecureStore.setItemAsync("autocare.session", value);
  else await SecureStore.deleteItemAsync("autocare.session");
}
export async function api(path: string, method = "GET", body?: unknown) {
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
    if (e.name === "AbortError" || e.message === "Network request failed")
      throw new Error(
        "Không kết nối được máy chủ. Kiểm tra Wi-Fi và backend đang chạy.",
      );
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
