import * as Notifications from "./local-notifications";
import {AndroidImportance} from "./local-notifications";
import { Platform } from "react-native";
import { isRunningInExpoGo } from "expo";
import { prepareReminderChannel } from "./notification-channel";
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});
let lastSignature = "";
let syncing = false;
let channelReady = false;
let reminderChannel: string | undefined;
async function ensureChannel() {
  if (channelReady) return;
  reminderChannel = await prepareReminderChannel(
    Platform.OS === "android",
    isRunningInExpoGo(),
    () => Notifications.setNotificationChannelAsync("maintenance", {
      name: "Lịch bảo dưỡng",
      importance: AndroidImportance.HIGH,
    }),
  );
  channelReady = true;
}
export async function enableReminders() {
  if(Platform.OS==='web')throw new Error('Nhắc lịch trên thiết bị được hỗ trợ trong ứng dụng Android/iOS.');
  await ensureChannel();
  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted)
    throw new Error(
      "Bạn chưa cho phép thông báo. Có thể bật lại trong cài đặt điện thoại.",
    );
  lastSignature = "";
}
export async function clearReminders() {
  if(Platform.OS==='web')return;
  lastSignature = "";
  for (const n of await Notifications.getAllScheduledNotificationsAsync())
    if (n.content.data?.app === "autocare")
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
}
export async function syncReminders(appointments: any[], userId: number) {
  if(Platform.OS==='web')return;
  if (syncing) return;
  const wanted = appointments.filter(
    (a) => a.status === "confirmed" && Date.parse(a.starts_at) > Date.now(),
  );
  const signature = JSON.stringify([
    userId,
    wanted.map((a) => [a.id, a.starts_at, a.reminder_hours]),
  ]);
  if (signature === lastSignature) return;
  if (!(await Notifications.getPermissionsAsync()).granted) return;
  await ensureChannel();
  syncing = true;
  try {
    await clearReminders();
    for (const a of wanted) {
      const at =
        Date.parse(a.starts_at) - Number(a.reminder_hours || 24) * 3600000;
      if (at <= Date.now()) continue;
      await Notifications.scheduleNotificationAsync({
        identifier: `autocare-${userId}-${a.id}`,
        content: {
          title: "Sắp đến lịch bảo dưỡng",
          body: `${a.plate} · ${a.garage_name} · ${new Date(a.starts_at).toLocaleString("vi-VN", { timeZone: "Asia/Bangkok" })}`,
          data: { app: "autocare", appointmentId: a.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(at),
          ...(reminderChannel ? { channelId: reminderChannel } : {}),
        },
      });
    }
    lastSignature = signature;
  } finally {
    syncing = false;
  }
}
