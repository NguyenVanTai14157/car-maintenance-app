import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const KEY = "autocare.remembered-email";

/** Remember only the email; passwords are never persisted by this feature. */
export async function readRememberedAccount(): Promise<string> {
  return (
    (Platform.OS === "web"
      ? localStorage.getItem(KEY)
      : await SecureStore.getItemAsync(KEY)) || ""
  );
}
export async function rememberAccount(email: string | null): Promise<void> {
  if (Platform.OS === "web") {
    if (email) localStorage.setItem(KEY, email.trim().toLowerCase());
    else localStorage.removeItem(KEY);
  } else if (email) {
    await SecureStore.setItemAsync(KEY, email.trim().toLowerCase());
  } else {
    await SecureStore.deleteItemAsync(KEY);
  }
}
