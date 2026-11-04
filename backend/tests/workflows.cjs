require("dotenv").config({ quiet: true });
require("reflect-metadata");
require("tsx/cjs");
const assert = require("node:assert/strict");
const { db } = require("../src/database/connection.ts");
const {
  AppointmentsService,
} = require("../src/modules/appointments/appointments.service.ts");
const {
  AppointmentsRepository,
} = require("../src/modules/appointments/appointments.repository.ts");
const { DatabaseService } = require("../src/database/database.service.ts");
const reminderService = new AppointmentsService(
  new AppointmentsRepository(new DatabaseService()),
);
const reminders = () => reminderService.reminders();
const base = process.env.TEST_API_URL || "http://localhost:3000";
const suffix = Date.now().toString();
const created = {
  users: [],
  vehicles: [],
  appointments: [],
  services: [],
  garages: [],
};
let checks = 0;
async function request(path, method = "GET", body, token, expected = 200) {
  const r = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await r.json();
  assert.equal(
    r.status,
    expected,
    `${method} ${path}: ${JSON.stringify(result)}`,
  );
  checks++;
  return result;
}
const pw = "WorkflowTest123!";
async function main() {
  await request("/appointments", "GET", undefined, undefined, 401);
  const admin = await request(
    "/auth/login",
    "POST",
    { identifier: "admin@gmail.com", password: process.env.DEMO_PASSWORD },
    null,
    201,
  );
  async function staff(role, n) {
    const u = await request(
      "/users",
      "POST",
      {
        name: "Test " + n,
        email: `${n}-${suffix}@example.com`,
        role,
        password: pw,
      },
      admin.accessToken,
      201,
    );
    created.users.push(u.id);
    return request(
      "/auth/login",
      "POST",
      { identifier: u.email, password: pw },
      null,
      201,
    );
  }
  const reception = await staff("receptionist", "reception"),
    tech = await staff("technician", "tech"),
    otherTech = await staff("technician", "other-tech");
  async function customer(n) {
    const u = await request(
      "/auth/register",
      "POST",
      {
        name: "Khách kiểm thử " + n,
        email: `c${n}-${suffix}@example.com`,
        password: pw,
        role: "admin",
      },
      null,
      201,
    );
    created.users.push(u.user.id);
    assert.equal(u.user.role, "customer");
    return u;
  }
  const customer1 = await customer(1),
    customer2 = await customer(2),
    customer3 = await customer(3);
  const ct = customer1.accessToken,
    rt = reception.accessToken,
    tt = tech.accessToken,
    at = admin.accessToken;
  await request("/users", "GET", undefined, ct, 403);
  await request(
    "/auth/register",
    "POST",
    { name: "Duplicate", email: customer1.user.email, password: pw },
    null,
    409,
  );
  await request(
    "/auth/login",
    "POST",
    { identifier: customer1.user.email, password: "invalid" },
    null,
    401,
  );
  async function vehicle(u, n) {
    const v = await request(
      "/vehicles",
      "POST",
      {
        plate: "T" + suffix.slice(-7) + n,
        brand: "Toyota",
        model: "Vios",
        year: 2024,
        odometer: 1000,
      },
      u.accessToken,
      201,
    );
    created.vehicles.push(v.id);
    return v;
  }
  const v = await vehicle(customer1, 1),
    v2 = await vehicle(customer2, 2),
    v3 = await vehicle(customer3, 3);
  await request("/vehicles/" + v.id, "PATCH", { ...v, odometer: 900 }, ct, 400);
  await request(
    "/vehicles/" + v.id,
    "PATCH",
    { ...v, odometer: 1100 },
    customer2.accessToken,
    403,
  );
  const g = await request(
    "/garages",
    "POST",
    { name: "Test gara " + suffix, address: "Fixture only" },
    at,
    201,
  );
  created.garages.push(g.id);
  await request(
    "/garages/" + g.id,
    "PATCH",
    { ...g, capacity: 1, cancel_hours: 0, reminder_hours: 168 },
    at,
  );
  const service = await request(
    "/services",
    "POST",
    {
      name: "Test service " + suffix,
      price: 100000,
      duration: 60,
      description: "Fixture",
      checklistText: "Kiểm tra\nThay dầu",
      active: true,
    },
    at,
    201,
  );
  created.services.push(service.id);
  let day = new Date(Date.now() + 48 * 3600000);
  day.setUTCHours(2, 0, 0, 0);
  const when = day.toISOString();
  async function book(u, vehicle, when2 = when, expected = 201) {
    const a = await request(
      "/appointments",
      "POST",
      {
        vehicle_id: vehicle.id,
        garage_id: g.id,
        service_ids: [service.id],
        starts_at: when2,
      },
      u.accessToken,
      expected,
    );
    if (expected === 201) created.appointments.push(a.id);
    return a;
  }
  await book(customer2, v, when, 403);
  const concurrent = await Promise.all([
    fetch(base + "/appointments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + ct,
      },
      body: JSON.stringify({
        vehicle_id: v.id,
        garage_id: g.id,
        service_ids: [service.id],
        starts_at: when,
      }),
    }),
    fetch(base + "/appointments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + customer2.accessToken,
      },
      body: JSON.stringify({
        vehicle_id: v2.id,
        garage_id: g.id,
        service_ids: [service.id],
        starts_at: when,
      }),
    }),
  ]);
  assert.deepEqual(concurrent.map((r) => r.status).sort(), [201, 400]);
  checks++;
  let a;
  let owner;
  for (let i = 0; i < concurrent.length; i++) {
    const data = await concurrent[i].json();
    if (concurrent[i].status === 201) {
      a = data;
      created.appointments.push(a.id);
      owner = i === 0 ? customer1 : customer2;
    }
  }
  const ot = owner.accessToken;
  const stranger = owner === customer1 ? customer2 : customer1;
  const act = (action, token = rt, body = {}, expected = 201) =>
    request(
      "/appointments/" + a.id + "/action",
      "POST",
      { action, ...body },
      token,
      expected,
    );
  if (process.env.CONSTRAINT_AUDIT)
    await require("./constraints-cases.cjs")({
      db,
      base,
      a,
      g,
      service,
      v: owner === customer1 ? v : v2,
      owner,
      admin,
      reception,
      tech,
      stranger,
      created,
    });
  await request(
    "/appointments/" + a.id,
    "GET",
    undefined,
    stranger.accessToken,
    403,
  );
  await act("confirm", ot, {}, 403);
  await act("start", tt, {}, 403);
  await act("confirm");
  await act("confirm", rt, {}, 400);
  await reminders();
  const before = Number(
    (
      await db.query(
        "SELECT count(*) n FROM notifications WHERE appointment_id=$1",
        [a.id],
      )
    ).rows[0].n,
  );
  await reminders();
  assert.equal(
    Number(
      (
        await db.query(
          "SELECT count(*) n FROM notifications WHERE appointment_id=$1",
          [a.id],
        )
      ).rows[0].n,
    ),
    before,
  );
  checks++;
  const later = new Date(day.getTime() + 2 * 3600000).toISOString();
  await act("propose", rt, { starts_at: later, reason: "Đổi giờ" });
  await act("accept_time", ot);
  await act("receive", rt, { condition: "Xe bình thường", odometer: 1100 });
  await act("assign", rt, { technician_id: tech.user.id });
  await request(
    "/appointments/" + a.id,
    "GET",
    undefined,
    otherTech.accessToken,
    403,
  );
  await act("accept", tt);
  await act("start", tt);
  await act("finish", tt, {}, 400);
  await act("checklist", tt, { checked: [true, true] });
  await act("extra", tt, { description: "Lọc dầu", amount: 25000 });
  await act("finish", tt, {}, 400);
  let detail = await request("/appointments/" + a.id, "GET", undefined, ot);
  await act("approve_extra", ot, { extra_id: detail.extras[0].id });
  await act("approve_extra", ot, { extra_id: detail.extras[0].id }, 400);
  await act("finish", tt, {}, 400);
  const png =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jG1kAAAAASUVORK5CYII=";
  await act("photo", tt, { kind: "before", images: [] }, 400);
  await act("photo", tt, { kind: "before", images: [png, "invalid"] }, 400);
  assert.equal(
    (await request("/appointments/" + a.id, "GET", undefined, tt)).photos
      .length,
    0,
  );
  checks++;
  const secondPng =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
  await act("photo", tt, { kind: "before", images: [png, secondPng, png] });
  await act("finish", tt, {}, 400);
  await act("photo", tt, { kind: "before", data: png }, 400);
  await act("photo", tt, { kind: "after", data: png });
  await act("photo", tt, { kind: "after", images: [png] }, 400);
  const uploaded = (
    await request("/appointments/" + a.id, "GET", undefined, tt)
  ).photos;
  const beforePhotos = uploaded.filter((p) => p.kind === "before");
  const afterPhoto = uploaded.find((p) => p.kind === "after");
  await act(
    "photo_update",
    ot,
    { photo_id: beforePhotos[0].id, data: secondPng },
    403,
  );
  await act("photo_delete", rt, { photo_id: beforePhotos[0].id }, 403);
  await act("photo_update", tt, { photo_id: 2147483647, data: png }, 400);
  await act("photo_delete", tt, { photo_id: 2147483647 }, 400);
  await act(
    "photo_update",
    tt,
    { photo_id: beforePhotos[0].id, data: "invalid" },
    400,
  );
  await act("photo_update", tt, {
    photo_id: beforePhotos[0].id,
    data: secondPng,
  });
  const replaced = (
    await request("/appointments/" + a.id, "GET", undefined, tt)
  ).photos;
  assert.equal(replaced.length, 3);
  assert.equal(
    replaced.find((p) => p.id === beforePhotos[0].id).data,
    secondPng,
  );
  assert.equal(
    replaced.find((p) => p.id === beforePhotos[0].id).kind,
    "before",
  );
  checks += 3;
  await act("photo_delete", tt, { photo_id: beforePhotos[0].id });
  await act("photo", tt, { kind: "before", data: png }, 400);
  await act("photo_delete", tt, { photo_id: afterPhoto.id });
  await act("finish", tt, {}, 400);
  await act("photo", tt, { kind: "after", images: [png, secondPng] });
  await act("condition", tt, { condition: "Đã kiểm tra đầy đủ" });
  await act("finish", tt);
  await act("photo_delete", tt, { photo_id: beforePhotos[1].id }, 400);
  await act("handover", rt, {}, 400);
  await act("payment", ot, { paid: true }, 403);
  await act("payment", rt, { paid: true });
  await act("handover");
  await act("review", ot, { rating: 5, comment: "Dịch vụ tốt" });
  await act("review", ot, { rating: 4 }, 409);
  detail = await request("/appointments/" + a.id, "GET", undefined, ot);
  assert.equal(detail.status, "completed");
  assert.equal(detail.total, 125000);
  assert.equal(detail.review.rating, 5);
  assert.equal(detail.photos.length, 3);
  checks += 4;
  const report = await request("/reports", "GET", undefined, at);
  assert.ok(Number(report.summary.revenue) >= 125000);
  checks++;
  const notices = await request("/notifications", "GET", undefined, ot);
  assert.ok(notices.some((n) => n.appointment_id === a.id));
  checks++;
  await request("/notifications/read", "POST", {}, ot, 201);
  // Cancellation, rejection, customer rescheduling, declined extras and stopped services.
  a = await book(
    customer1,
    v,
    new Date(day.getTime() + 24 * 3600000).toISOString(),
  );
  await act("reschedule", ct, {
    starts_at: new Date(day.getTime() + 25 * 3600000).toISOString(),
    reason: "Khách bận",
  });
  await act("cancel", ct, { reason: "Không còn nhu cầu" });
  a = await book(
    customer2,
    v2,
    new Date(day.getTime() + 48 * 3600000).toISOString(),
  );
  await act("reject", rt, { reason: "Gara bảo trì" });
  await request(
    "/services/" + service.id,
    "PATCH",
    { ...service, checklistText: "Kiểm tra\nThay dầu", active: false },
    at,
  );
  await book(
    customer3,
    v3,
    new Date(day.getTime() + 72 * 3600000).toISOString(),
    400,
  );
  await request(
    "/users/" + otherTech.user.id,
    "PATCH",
    { ...otherTech.user, active: false },
    at,
  );
  await request("/auth/me", "GET", undefined, otherTech.accessToken, 401);
  const profile = await request(
    "/auth/me",
    "PATCH",
    {
      name: "Nguyễn Kiểm Thử",
      email: customer3.user.email,
      phone: null,
      avatar: png,
    },
    customer3.accessToken,
  );
  assert.equal(profile.name, "Nguyễn Kiểm Thử");
  checks++;
  await request("/auth/logout", "POST", {}, customer3.accessToken, 201);
  await request("/auth/me", "GET", undefined, customer3.accessToken, 401);
  console.log(
    `PASS: ${checks} assertions; four roles, concurrent capacity, ownership, transitions, checklist, extras, photos, payment, handover, review, reports, reminders, profile, lock, logout.`,
  );
}
async function cleanup() {
  await db.query("BEGIN");
  try {
    for (const table of [
      "reviews",
      "photos",
      "extras",
      "events",
      "notifications",
    ])
      await db.query(`DELETE FROM ${table} WHERE appointment_id=ANY($1)`, [
        created.appointments,
      ]);
    await db.query("DELETE FROM appointments WHERE id=ANY($1)", [
      created.appointments,
    ]);
    await db.query("DELETE FROM vehicles WHERE id=ANY($1)", [created.vehicles]);
    await db.query("DELETE FROM sessions WHERE user_id=ANY($1)", [
      created.users,
    ]);
    await db.query("DELETE FROM notifications WHERE user_id=ANY($1)", [
      created.users,
    ]);
    await db.query("DELETE FROM users WHERE id=ANY($1)", [created.users]);
    await db.query("DELETE FROM services WHERE id=ANY($1)", [created.services]);
    await db.query("DELETE FROM garages WHERE id=ANY($1)", [created.garages]);
    await db.query("COMMIT");
  } catch (e) {
    await db.query("ROLLBACK");
    throw e;
  } finally {
    await db.end();
  }
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(cleanup);
