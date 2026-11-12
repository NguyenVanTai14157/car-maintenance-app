require("node:module").createRequire(
  require("node:path").resolve(__dirname, "../../backend/package.json"),
)("tsx/cjs");
const assert = require("node:assert/strict");
const {
  prepareReminderChannel,
} = require("../src/services/notification-channel.ts");
(async () => {
  let called = 0;
  const ok = async () => {
    called++;
  };
  assert.equal(await prepareReminderChannel(false, false, ok), undefined);
  assert.equal(called, 0);
  assert.equal(await prepareReminderChannel(true, false, ok), "maintenance");
  const broken = async () => {
    throw Error(
      "ExpoNotificationChannelManager.setNotificationChannelAsync: java.lang.NullPointerException",
    );
  };
  assert.equal(await prepareReminderChannel(true, true, broken), undefined);
  await assert.rejects(
    prepareReminderChannel(true, false, broken),
    /Chưa bật được thông báo nhắc lịch/,
  );
  await assert.rejects(
    prepareReminderChannel(true, true, async () => {
      throw Error("other failure");
    }),
    /Chưa bật được thông báo nhắc lịch/,
  );
  console.log(
    "PASS: iOS skip, Android channel, Expo Go NPE fallback, standalone failure, unrelated failure",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
