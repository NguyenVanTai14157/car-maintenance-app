// SDK 58 Expo Go on Android may omit ExpoApplication (expo/expo#51180).
// Import only local-notification APIs so unused push-token registration does not
// load ExpoApplication at startup. Recheck these paths when upgrading Expo SDK.
export {setNotificationHandler} from 'expo-notifications/build/NotificationsHandler';
export {getPermissionsAsync,requestPermissionsAsync} from 'expo-notifications/build/NotificationPermissions';
export {setNotificationChannelAsync} from 'expo-notifications/build/setNotificationChannelAsync';
export {getAllScheduledNotificationsAsync} from 'expo-notifications/build/getAllScheduledNotificationsAsync';
export {cancelScheduledNotificationAsync} from 'expo-notifications/build/cancelScheduledNotificationAsync';
export {scheduleNotificationAsync} from 'expo-notifications/build/scheduleNotificationAsync';
export {AndroidImportance} from 'expo-notifications/build/NotificationChannelManager.types';
export {SchedulableTriggerInputTypes} from 'expo-notifications/build/Notifications.types';
