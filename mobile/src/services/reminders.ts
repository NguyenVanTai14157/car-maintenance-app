import { isRunningInExpoGo } from "expo";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import * as Notifications from "./local-notifications";
import { AndroidImportance } from "./local-notifications";
import { prepareReminderChannel } from "./notification-channel";
import { planAlert } from "../utils/plan-alert";
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});
let channel: string | undefined,
  ready = false,
  signature = "",
  queue = Promise.resolve();
async function ensureChannel() {
  if (ready) return;
  channel = await prepareReminderChannel(
    Platform.OS === "android",
    isRunningInExpoGo(),
    () =>
      Notifications.setNotificationChannelAsync("maintenance", {
        name: "Bảo dưỡng cá nhân",
        importance: AndroidImportance.HIGH,
      }),
  );
  ready = true;
}
export async function enableReminders() {
  if (Platform.OS === "web")
    throw Error("Bật nhắc trên điện thoại Android/iOS.");
  await ensureChannel();
  if (!(await Notifications.requestPermissionsAsync()).granted)
    throw Error(
      "Chưa có quyền thông báo. Bạn có thể bật trong cài đặt điện thoại.",
    );
  signature = "";
}
async function cancelScheduled() {
  if (Platform.OS === "web") return;
  for (const n of await Notifications.getAllScheduledNotificationsAsync())
    if (
      n.content.data?.app === "autocare-personal" ||
      n.content.data?.app === "autocare"
    )
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
}
export async function clearReminders() {
  await queue;
  await cancelScheduled();
  signature = "";
}
export function syncPersonalReminders(
  plans: any[],
  settings: any,
  uid: number,
) {
  const work = queue.then(() => sync(plans, settings, uid));
  queue = work.catch(() => {});
  return work;
}
async function sync(plans: any[], settings: any, uid: number) {
  if (Platform.OS === "web") return;
  if (!settings.notifications) {
    await cancelScheduled();
    signature = "";
    return;
  }
  const next = JSON.stringify([
    uid,
    settings,
    plans.map((p) => [
      p.id,
      p.status,
      p.reasons,
      p.due_date,
      p.due_km,
      p.remind_days,
      p.current_km,
      p.vehicle_archived,
    ]),
  ]);
  if (next === signature) return;
  if (!(await Notifications.getPermissionsAsync()).granted) return;
  await ensureChannel();
  await cancelScheduled();
  const wanted: { p: any; at: Date; label: string; key: string }[] = [];
  for (const p of plans) {
    if (p.vehicle_archived || ["completed", "cancelled"].includes(p.status))
      continue;
    if (p.due_date)
      for (const [offset, label] of [
        [-p.remind_days, "Sắp đến hạn theo ngày"],
        [0, "Đến hạn theo ngày"],
        [1, "Quá hạn theo ngày"],
      ] as const) {
        const date = new Date(p.due_date + "T00:00:00Z");
        date.setUTCDate(date.getUTCDate() + offset);
        const at = new Date(
          date.toISOString().slice(0, 10) +
            "T" +
            String(settings.remind_hour).padStart(2, "0") +
            ":00:00+07:00",
        );
        if (at.getTime() > Date.now())
          wanted.push({ p, at, label, key: "date-" + offset });
      }
    if (p.reasons?.includes("km")) {
      const key = `${p.id}:${p.status}:${p.current_km >= p.due_km ? "reached" : "soon"}:${new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" })}`,
        storeKey = `personal.notice.${uid}.${p.id}`;
      if ((await SecureStore.getItemAsync(storeKey)) !== key) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: p.category_name,
            body: `${p.plate || p.brand + " " + p.model} · ${planAlert(p).details.find((detail) => detail.includes("theo km:")) || `Theo km: hiện tại ${p.current_km} km; đến hạn ${p.due_km} km`}`,
            data: { app: "autocare-personal", planId: p.id },
          },
          trigger: null,
        });
        await SecureStore.setItemAsync(storeKey, key);
      }
    }
  }
  for (const { p, at, label, key } of wanted
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .slice(0, 50))
    await Notifications.scheduleNotificationAsync({
      identifier: `personal-${uid}-${p.id}-${key}`,
      content: {
        title: p.category_name,
        body: `${p.plate || p.brand + " " + p.model} · ${label}: ${p.due_date}`,
        data: { app: "autocare-personal", planId: p.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: at,
        ...(channel ? { channelId: channel } : {}),
      },
    });
  signature = next;
}
