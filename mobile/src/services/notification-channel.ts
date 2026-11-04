// Expo Go SDK 58 can reject its scoped channel manager with a native NPE.
// Omitting channelId lets expo-notifications use its built-in fallback channel.
export async function prepareReminderChannel(
  android: boolean,
  expoGo: boolean,
  create: () => Promise<unknown>,
): Promise<string | undefined> {
  if (!android) return undefined;
  try {
    await create();
    return "maintenance";
  } catch (error) {
    const message = error && typeof error === 'object' && 'message' in error
      ? String(error.message) : String(error);
    if (expoGo && message.includes("setNotificationChannelAsync") &&
        message.includes("NullPointerException")) return undefined;
    throw new Error("Không tạo được kênh nhắc lịch. Hãy thử lại sau khi mở lại ứng dụng.");
  }
}
