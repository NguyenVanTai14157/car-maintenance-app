// SDK 58 Expo Go on Android may omit ExpoApplication (expo/expo#51180).
// Import only local-notification APIs so unused push-token registration does not
// load ExpoApplication at startup. Recheck these paths when upgrading Expo SDK.
export { cancelScheduledNotificationAsync } from "expo-notifications/build/cancelScheduledNotificationAsync";
export { getAllScheduledNotificationsAsync } from "expo-notifications/build/getAllScheduledNotificationsAsync";
export { AndroidImportance } from "expo-notifications/build/NotificationChannelManager.types";
export {
  getPermissionsAsync,
  requestPermissionsAsync,
} from "expo-notifications/build/NotificationPermissions";
export { SchedulableTriggerInputTypes } from "expo-notifications/build/Notifications.types";
export { setNotificationHandler } from "expo-notifications/build/NotificationsHandler";
export { scheduleNotificationAsync } from "expo-notifications/build/scheduleNotificationAsync";
export { setNotificationChannelAsync } from "expo-notifications/build/setNotificationChannelAsync";
