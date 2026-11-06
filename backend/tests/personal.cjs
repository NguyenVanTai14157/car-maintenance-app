const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
require("dotenv").config({ quiet: true });
require("tsx/cjs");
const { Pool } = require("pg");
const { io } = require("socket.io-client");
const {
  planStatus,
  nextSuggestion,
} = require("../src/modules/personal/personal.rules.ts");
const base = process.env.TEST_API_URL || "http://127.0.0.1:3001";
const db = new Pool({ connectionString: process.env.DATABASE_URL });
let count = 0;
const users = [],
  sockets = [],
  mailFiles = [];
const stamp = Date.now();
let a, b;
async function req(user, method, url, body, status = 200) {
  const r = await fetch(base + url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(user ? { Authorization: "Bearer " + user.accessToken } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const out = await r.json();
  if (status === 200)
    assert.ok(r.ok, `${method} ${url}: ${r.status} ${JSON.stringify(out)}`);
  else
    assert.equal(r.status, status, `${method} ${url}: ${JSON.stringify(out)}`);
  count++;
  return out;
}
const get = (u, p) => req(u, "GET", p),
  post = (u, p, b, s) => req(u, "POST", p, b, s),
  patch = (u, p, b, s) => req(u, "PATCH", p, b, s),
  del = (u, p, s) => req(u, "DELETE", p, undefined, s);
const day = new Date().toLocaleDateString("en-CA", {
  timeZone: "Asia/Bangkok",
});
const shift = (n) => {
  let d = new Date(day + "T00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const fixture = (n) => ({
  name: "Personal QA " + n,
  email: `personal-${stamp}-${n}@example.com`,
  password: "Test!123456",
});
async function register(n) {
  const f = fixture(n),
    u = await post(null, "/auth/register", { ...f, role: "admin" });
  users.push(u.user.id);
  assert.equal(u.user.role, "user");
  assert.equal(u.user.password_hash, undefined);
  return { ...u, email: f.email };
}
async function socket(u) {
  const s = io(base + "/realtime", {
    auth: { token: u.accessToken },
    transports: ["websocket"],
    reconnection: false,
  });
  sockets.push(s);
  await new Promise((resolve, reject) => {
    s.once("connect", resolve);
    s.once("connect_error", reject);
    setTimeout(() => reject(Error("socket timeout")), 5000).unref();
  });
  return s;
}
(async () => {
  assert.match(
    new URL(process.env.DATABASE_URL).pathname,
    /personal/,
    "Use only personal database",
  );
  for (const [p, status, reasons] of [
    [{ due_date: day, due_km: 200, current_km: 100 }, "due", ["date"]],
    [{ due_date: shift(10), due_km: 100, current_km: 100 }, "due", ["km"]],
    [
      { due_date: shift(-1), due_km: 90, current_km: 100 },
      "overdue",
      ["date", "km"],
    ],
    [
      {
        due_date: shift(2),
        due_km: 1000,
        current_km: 100,
        remind_days: 7,
        remind_km: 100,
      },
      "soon",
      ["date"],
    ],
    [
      {
        due_date: shift(40),
        due_km: 1000,
        current_km: 100,
        remind_days: 7,
        remind_km: 100,
      },
      "planned",
      [],
    ],
    [{ completed_record_id: 1, cancelled: true }, "completed", []],
  ]) {
    assert.deepEqual(planStatus(p, day), { status, reasons });
    count++;
  }
  assert.deepEqual(
    nextSuggestion({
      performed_date: "2024-01-31",
      interval_months: 1,
      interval_km: 500,
      odometer: 100,
    }),
    { due_date: "2024-02-29", due_km: 600 },
  );
  count++;
  a = await register("a");
  b = await register("b");
  await post(
    null,
    "/auth/register",
    { name: "No email", phone: "0901111222", password: "Test!123456" },
    400,
  );
  await post(
    null,
    "/auth/login",
    { identifier: a.email, password: "wrong" },
    401,
  );
  await get(null, "/health");
  await req(null, "GET", "/vehicles", undefined, 401);
  const cats = await get(a, "/categories"),
    cat = cats[0].id;
  assert.equal(cats.length, 4);
  assert.equal((await get(a, "/settings")).notifications, true);
  const c = await post(a, "/categories", { name: "Ắc quy" });
  await post(a, "/categories", { name: "Ắc quy" }, 409);
  await patch(a, "/categories/" + c.id, { name: "Ắc quy mới", active: true });
  await del(a, "/categories/" + c.id);
  const v = await post(a, "/vehicles", {
    brand: "Toyota",
    model: "Vios",
    odometer: 10000,
  });
  assert.equal(v.plate, null);
  const v2 = await post(a, "/vehicles", {
    brand: "Ford",
    model: "Ranger",
    plate: "51A-123.45",
    odometer: 0,
  });
  await post(
    a,
    "/vehicles",
    { brand: "Ford", model: "Ranger", plate: "51A12345", odometer: 0 },
    409,
  );
  await post(b, "/vehicles", {
    brand: "Ford",
    model: "Ranger",
    plate: "51A12345",
    odometer: 0,
  });
  await post(a, "/vehicles", { brand: "", model: "A", odometer: 0 }, 400);
  await patch(a, "/vehicles/" + v.id, { ...v, odometer: 9999 }, 400);
  assert.equal((await get(b, "/vehicles")).length, 1);
  await patch(b, "/vehicles/" + v.id, { ...v, odometer: 20000 }, 404);
  await del(b, "/vehicles/" + v.id, 404);
  const body = {
    vehicle_id: v.id,
    category_id: cat,
    due_date: shift(10),
    due_km: 10000,
    interval_months: 6,
    interval_km: 5000,
  };
  await post(a, "/plans", { ...body, due_date: null, due_km: null }, 400);
  await post(a, "/plans", { ...body, due_date: "2026-02-30" }, 400);
  await post(b, "/plans", body, 404);
  const p = await post(a, "/plans", body);
  assert.deepEqual((await get(a, "/plans/" + p.id)).reasons, ["km"]);
  assert.equal((await get(a, "/plans/" + p.id)).status, "due");
  await req(b, "GET", "/plans/" + p.id, undefined, 404);
  await post(b, "/plans/" + p.id + "/cancel", {}, 404);
  await patch(b, "/categories/" + cat, { name: "Hacked", active: true }, 404);
  let notes = await get(a, "/notifications");
  assert.ok(
    notes.some((n) => n.plan_id === p.id && n.message.includes("theo km")),
  );
  assert.equal((await get(a, "/notifications")).length, notes.length);
  await post(a, "/notifications/read", {});
  assert.ok((await get(a, "/notifications")).every((n) => n.read));
  const record = {
    vehicle_id: v.id,
    category_id: cat,
    plan_id: p.id,
    performed_date: day,
    odometer: 10000,
    cost: 650000,
    content: "Thay dầu và kiểm tra",
    images: ["data:image/png;base64,iVBORw0KGgo="],
  };
  await post(a, "/records", { ...record, performed_date: shift(1) }, 400);
  await post(a, "/records", { ...record, cost: -1 }, 400);
  await post(b, "/records", record, 404);
  const concurrent = await Promise.all([
    fetch(base + "/records", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + a.accessToken,
      },
      body: JSON.stringify(record),
    }),
    fetch(base + "/records", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + a.accessToken,
      },
      body: JSON.stringify(record),
    }),
  ]);
  assert.deepEqual(concurrent.map((r) => r.status).sort(), [201, 400]);
  count++;
  const r = (await get(a, "/records"))[0];
  assert.equal((await get(a, "/plans/" + p.id)).status, "completed");
  assert.equal((await get(a, "/plans")).length, 1);
  assert.deepEqual(r.suggestion, {
    due_date: nextSuggestion({ ...r, interval_months: 6 }).due_date,
    due_km: 15000,
  });
  await patch(a, "/plans/" + p.id, body, 400);
  await post(a, "/plans/" + p.id + "/cancel", {}, 400);
  await patch(b, "/records/" + r.id, record, 404);
  await del(b, "/records/" + r.id, 404);
  await req(b, "GET", "/records/" + r.id, undefined, 404);
  const next = await post(a, "/plans/from-record/" + r.id, {});
  assert.equal(next.due_km, 15000);
  await post(a, "/plans/from-record/" + r.id, {}, 400);
  await patch(a, "/records/" + r.id, { ...record, cost: 700000 });
  assert.equal((await get(a, "/costs")).total, 700000);
  await post(
    a,
    "/records",
    { ...record, plan_id: null, performed_date: shift(-2), odometer: 11000 },
    400,
  );
  const history = await post(a, "/records", {
    ...record,
    plan_id: null,
    performed_date: shift(-2),
    odometer: 9000,
    cost: 100000,
  });
  await patch(
    a,
    "/records/" + history.id,
    { ...history, plan_id: next.id },
    400,
  );
  assert.equal((await get(a, "/costs")).total, 800000);
  await del(a, "/vehicles/" + v.id, 400);
  await del(a, "/categories/" + cat, 400);
  await patch(a, "/categories/" + cat, { name: cats[0].name, active: false });
  await post(a, "/plans", body, 400);
  await patch(a, "/categories/" + cat, { name: cats[0].name, active: true });
  await post(a, "/vehicles/" + v.id + "/archive", { archived: true });
  assert.equal((await get(a, "/dashboard")).vehicles, 1);
  await post(a, "/plans", body, 400);
  await post(a, "/records", { ...record, plan_id: null }, 400);
  assert.equal((await get(a, "/costs")).total, 800000);
  await post(a, "/vehicles/" + v.id + "/archive", { archived: false });
  await post(a, "/plans/" + next.id + "/cancel", {});
  assert.equal((await get(a, "/plans/" + next.id)).status, "cancelled");
  await post(a, "/records", { ...record, plan_id: next.id }, 400);
  await del(a, "/records/" + r.id);
  assert.equal((await get(a, "/plans/" + p.id)).status, "due");
  assert.equal((await get(a, "/costs")).total, 100000);
  const dueBoth = await post(a, "/plans", {
    ...body,
    due_date: shift(-1),
    due_km: 9999,
  });
  const both = await get(a, "/plans/" + dueBoth.id);
  assert.equal(both.status, "overdue");
  assert.deepEqual(both.reasons, ["date", "km"]);
  assert.ok(
    (await get(a, "/notifications")).some(
      (n) =>
        n.plan_id === dueBoth.id &&
        n.message.includes("theo ngày") &&
        n.message.includes("theo km"),
    ),
  );
  await patch(a, "/settings", {
    notifications: false,
    remind_days: 7,
    remind_km: 500,
    remind_hour: 9,
  });
  const nBefore = (await get(a, "/notifications")).length;
  await post(a, "/plans", { ...body, due_date: shift(-2) });
  assert.equal((await get(a, "/notifications")).length, nBefore);
  await patch(
    a,
    "/settings",
    { notifications: true, remind_days: 7, remind_km: 500, remind_hour: 25 },
    400,
  );
  await patch(a, "/settings", {
    notifications: true,
    remind_days: 7,
    remind_km: 500,
    remind_hour: 9,
  });
  const sa = await socket(a),
    sb = await socket(b);
  const eventsA = [],
    eventsB = [];
  sa.on("data:changed", (e) => eventsA.push(e));
  sb.on("data:changed", (e) => eventsB.push(e));
  await new Promise((r) => setTimeout(r, 300));
  eventsA.length = eventsB.length = 0;
  await patch(a, "/vehicles/" + v.id, { ...v, odometer: 10001 });
  await new Promise((r) => setTimeout(r, 500));
  assert.ok(eventsA.some((e) => e.resources.includes("vehicles")));
  assert.equal(eventsB.length, 0);
  count++;
  const backup = await get(a, "/backup");
  assert.equal(backup.kind, "autocare-personal");
  assert.equal(JSON.stringify(backup).includes("password"), false);
  const bBefore = await get(b, "/backup");
  const bad = structuredClone(backup);
  bad.records[0].vehicle_id = 99999999;
  await post(b, "/backup/restore", bad, 400);
  assert.equal((await get(b, "/vehicles")).length, bBefore.vehicles.length);
  await post(b, "/backup/restore", backup);
  const restored = await get(b, "/backup");
  assert.equal(restored.records.length, backup.records.length);
  assert.equal(restored.vehicles.length, backup.vehicles.length);
  assert.ok(restored.vehicles.every((v) => v.owner_id === b.user.id));
  assert.equal((await get(a, "/records")).length, backup.records.length);
  assert.deepEqual(restored.records[0].images, backup.records[0].images);
  await patch(a, "/records/" + history.id, {
    ...history,
    interval_months: 3,
    interval_km: 2000,
  });
  const follow = await post(a, "/plans/from-record/" + history.id, {});
  await patch(
    a,
    "/records/" + history.id,
    { ...history, vehicle_id: v2.id },
    400,
  );
  const chain = await get(a, "/backup");
  const badSource = structuredClone(chain);
  badSource.plans.find((x) => x.id === follow.id).vehicle_id = v2.id;
  await post(b, "/backup/restore", badSource, 400);
  await post(b, "/backup/restore", chain);
  const mapped = await get(b, "/backup"),
    mappedPlan = mapped.plans.find((x) => x.source_record_id);
  assert.equal(mappedPlan.source_record_id, mapped.records[0].id);
  assert.equal(mappedPlan.vehicle_id, mapped.records[0].vehicle_id);
  const nullItem = structuredClone(backup);
  nullItem.vehicles = [null];
  await post(b, "/backup/restore", nullItem, 400);
  const duplicateId = structuredClone(backup);
  duplicateId.vehicles.push(duplicateId.vehicles[0]);
  await post(b, "/backup/restore", duplicateId, 400);
  // Expired secrets and concurrent reset submissions must not bypass one-use recovery.
  const expired = crypto.randomBytes(32).toString("hex");
  await db.query(
    "INSERT INTO password_resets(user_id,token_hash,expires_at) VALUES($1,$2,now()-interval '1 minute')",
    [b.user.id, crypto.createHash("sha256").update(expired).digest("hex")],
  );
  await post(
    null,
    "/auth/reset-password",
    { token: expired, password: "Changed!123" },
    400,
  );
  const raceToken = crypto.randomBytes(32).toString("hex");
  await db.query(
    "INSERT INTO password_resets(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '15 minutes')",
    [b.user.id, crypto.createHash("sha256").update(raceToken).digest("hex")],
  );
  const resets = await Promise.all(
    [1, 2].map(() =>
      fetch(base + "/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: raceToken, password: "RaceChanged!123" }),
      }),
    ),
  );
  assert.deepEqual(resets.map((r) => r.status).sort(), [201, 400]);
  count++;
  await req(b, "GET", "/auth/me", undefined, 401);
  // Recovery: preview-only mailbox, hashed one-use secret and session revocation.
  const generic = await post(null, "/auth/forgot-password", { email: a.email });
  assert.equal(generic.token, undefined);
  const missing = await post(null, "/auth/forgot-password", {
    email: `missing-${stamp}@example.com`,
  });
  assert.deepEqual(generic, missing);
  const dir = path.resolve(__dirname, "../../.local-backups/mail-preview");
  const found = fs
    .readdirSync(dir)
    .filter((n) => n.endsWith(".json"))
    .map((n) => ({
      file: path.join(dir, n),
      mail: JSON.parse(fs.readFileSync(path.join(dir, n), "utf8")),
    }))
    .find((x) => x.mail.to === a.email);
  assert.ok(found, "Preview mail exists");
  mailFiles.push(found.file);
  const token = found.mail.token;
  const saved = (
    await db.query("SELECT * FROM password_resets WHERE user_id=$1", [
      a.user.id,
    ])
  ).rows[0];
  assert.notEqual(saved.token_hash, token);
  assert.equal(
    saved.token_hash,
    crypto.createHash("sha256").update(token).digest("hex"),
  );
  await post(
    null,
    "/auth/reset-password",
    { token: "bad", password: "Changed!123" },
    400,
  );
  await post(null, "/auth/reset-password", { token, password: "123" }, 400);
  await post(null, "/auth/reset-password", { token, password: "Changed!123" });
  await req(a, "GET", "/auth/me", undefined, 401);
  await post(
    null,
    "/auth/reset-password",
    { token, password: "Changed!234" },
    400,
  );
  await post(
    null,
    "/auth/login",
    { identifier: a.email, password: "Test!123456" },
    401,
  );
  a = {
    ...(await post(null, "/auth/login", {
      identifier: a.email,
      password: "Changed!123",
    })),
    email: a.email,
  };
  await patch(
    a,
    "/auth/me",
    { name: "Nguyễn Văn Tài", phone: "0901111222" },
    400,
  );
  const me = await patch(a, "/auth/me", {
    name: "Nguyễn Văn Tài",
    email: a.email,
  });
  assert.equal(me.name, "Nguyễn Văn Tài");
  await post(a, "/auth/logout", {});
  await req(a, "GET", "/vehicles", undefined, 401);
  console.log(
    `PASS ${count} API/rule/security checks incl. realtime and preview recovery`,
  );
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    for (const s of sockets) s.disconnect();
    for (const id of users) {
      await db.query("DELETE FROM notifications WHERE user_id=$1", [id]);
      await db.query("DELETE FROM records WHERE owner_id=$1", [id]);
      await db.query("DELETE FROM plans WHERE owner_id=$1", [id]);
      await db.query("DELETE FROM vehicles WHERE owner_id=$1", [id]);
      await db.query("DELETE FROM categories WHERE owner_id=$1", [id]);
      await db.query("DELETE FROM settings WHERE owner_id=$1", [id]);
      await db.query("DELETE FROM users WHERE id=$1", [id]);
    }
    for (const file of mailFiles) fs.rmSync(file, { force: true });
    await db.end();
  });
