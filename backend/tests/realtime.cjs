require("dotenv").config({
  path: require("node:path").resolve(__dirname, "../.env"),
  quiet: true,
});
const assert = require("node:assert/strict");
const { io } = require("socket.io-client");
const { Pool } = require("pg");
const { hash } = require("bcryptjs");
const db = new Pool({ connectionString: process.env.DATABASE_URL });
const base = process.env.TEST_API_URL || "http://localhost:3001";
const ids = [],
  sockets = [],
  tag = Date.now();
let vehicle,
  garage,
  visit,
  checks = 0;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function once(socket, event, timeout = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, done);
      reject(Error("Timeout " + event));
    }, timeout);
    function done(data) {
      clearTimeout(timer);
      resolve(data);
    }
    socket.once(event, done);
  });
}
async function api(path, body, token) {
  const r = await fetch(base + path, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await r.json();
  assert.ok(r.ok, JSON.stringify(d));
  return d;
}
async function connect(token) {
  const s = io(base + "/realtime", {
    auth: { token },
    transports: ["websocket"],
    reconnection: false,
    autoConnect: false,
  });
  sockets.push(s);
  const ready = once(s, "connect");
  s.connect();
  await ready;
  return s;
}
(async () => {
  const rejected = io(base + "/realtime", {
    auth: { token: "invalid" },
    transports: ["websocket"],
    reconnection: false,
    autoConnect: false,
  });
  sockets.push(rejected);
  const rejection = once(rejected, "connect_error");
  rejected.connect();
  assert.equal((await rejection).message, "SESSION_EXPIRED");
  checks++;
  const password = "RealtimeTest123!",
    digest = await hash(password, 4);
  const actors = [];
  for (const [i, role] of [
    "customer",
    "customer",
    "receptionist",
    "technician",
    "technician",
  ].entries()) {
    const email = `rt-${tag}-${i}@example.com`;
    const u = (
      await db.query(
        "INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,$4) RETURNING id",
        [`Realtime ${i}`, email, digest, role],
      )
    ).rows[0];
    ids.push(u.id);
    const login = await api("/auth/login", { identifier: email, password });
    actors.push({
      ...u,
      token: login.accessToken,
      socket: await connect(login.accessToken),
    });
  }
  const [a, b, reception, t1, t2] = actors;
  await wait(150);
  for (const actor of actors) {
    actor.events = [];
    actor.socket.on("data:changed", (e) => actor.events.push(e));
  }
  vehicle = (
    await db.query(
      "INSERT INTO vehicles(owner_id,plate,brand,model,year,odometer) VALUES($1,$2,'Test','Test',2020,100) RETURNING id",
      [a.id, "RT" + String(tag).slice(-10)],
    )
  ).rows[0].id;
  garage = (
    await db.query(
      "INSERT INTO garages(name,address) VALUES($1,'Test') RETURNING id",
      ["RT" + tag],
    )
  ).rows[0].id;
  await wait(150);
  actors.forEach((x) => (x.events = []));
  visit = (
    await db.query(
      "INSERT INTO appointments(customer_id,vehicle_id,garage_id,starts_at,ends_at,services) VALUES($1,$2,$3,now()+interval '10 day',now()+interval '10 day 1 hour','[]') RETURNING id",
      [a.id, vehicle, garage],
    )
  ).rows[0].id;
  await wait(200);
  assert.ok(a.events.some((e) => e.resources.includes("appointments")));
  assert.ok(reception.events.length);
  assert.equal(b.events.length, 0);
  assert.equal(t1.events.length, 0);
  checks += 4;
  for (const e of a.events) assert.deepEqual(Object.keys(e), ["resources"]);
  checks++;
  actors.forEach((x) => (x.events = []));
  const c = await db.connect();
  try {
    await c.query("BEGIN");
    await c.query("UPDATE appointments SET status='confirmed' WHERE id=$1", [
      visit,
    ]);
    await wait(200);
    assert.equal(a.events.length, 0);
    checks++;
    await c.query("ROLLBACK");
    await wait(200);
    assert.equal(a.events.length, 0);
    checks++;
    await c.query("BEGIN");
    await c.query("UPDATE appointments SET status='confirmed' WHERE id=$1", [
      visit,
    ]);
    await wait(100);
    const event = once(a.socket, "data:changed");
    await c.query("COMMIT");
    await event;
    assert.equal(
      (await api("/appointments/" + visit, null, a.token)).status,
      "confirmed",
    );
    checks++;
  } finally {
    c.release();
  }
  actors.forEach((x) => (x.events = []));
  const assigned = once(t1.socket, "data:changed");
  await db.query(
    "UPDATE appointments SET technician_id=$1,status='assigned' WHERE id=$2",
    [t1.id, visit],
  );
  await assigned;
  checks++;
  actors.forEach((x) => (x.events = []));
  const removed = once(t1.socket, "data:changed"),
    added = once(t2.socket, "data:changed");
  await db.query("UPDATE appointments SET technician_id=$1 WHERE id=$2", [
    t2.id,
    visit,
  ]);
  await Promise.all([removed, added]);
  checks++;
  actors.forEach((x) => (x.events = []));
  const notice = once(a.socket, "data:changed");
  await db.query(
    "INSERT INTO notifications(user_id,appointment_id,message) VALUES($1,$2,'private')",
    [a.id, visit],
  );
  assert.ok((await notice).resources.includes("notifications"));
  await wait(100);
  assert.equal(b.events.length, 0);
  assert.equal(t2.events.length, 0);
  checks += 3;
  const expired = once(a.socket, "session:expired");
  await api("/auth/logout", {}, a.token);
  await expired;
  await wait(100);
  assert.equal(a.socket.connected, false);
  checks++;
  const locked = once(t2.socket, "session:expired");
  await db.query("UPDATE users SET active=false WHERE id=$1", [t2.id]);
  await locked;
  checks++;
  b.socket.disconnect();
  await db.query(
    "INSERT INTO notifications(user_id,message) VALUES($1,'offline update')",
    [b.id],
  );
  b.socket = await connect(b.token);
  assert.ok(
    (await api("/notifications", null, b.token)).some(
      (n) => n.message === "offline update",
    ),
  );
  checks++;
  console.log(
    `PASS: ${checks} realtime checks; authentication, private audiences, no row payload, commit/rollback, reassignment, notifications, logout/lock, reconnect resync data.`,
  );
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    sockets.forEach((s) => s.disconnect());
    const c = await db.connect();
    try {
      await c.query("BEGIN");
      if (visit) {
        for (const t of [
          "notifications",
          "events",
          "extras",
          "photos",
          "reviews",
        ])
          await c.query(`DELETE FROM ${t} WHERE appointment_id=$1`, [visit]);
        await c.query("DELETE FROM appointments WHERE id=$1", [visit]);
      }
      if (vehicle) await c.query("DELETE FROM vehicles WHERE id=$1", [vehicle]);
      if (garage) await c.query("DELETE FROM garages WHERE id=$1", [garage]);
      await c.query("DELETE FROM notifications WHERE user_id=ANY($1)", [ids]);
      await c.query("DELETE FROM sessions WHERE user_id=ANY($1)", [ids]);
      await c.query("DELETE FROM users WHERE id=ANY($1)", [ids]);
      await c.query("COMMIT");
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
      await db.end();
    }
  });
