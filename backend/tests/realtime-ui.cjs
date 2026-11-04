require("dotenv").config({
  path: require("node:path").resolve(__dirname, "../.env"),
  quiet: true,
});
const {
  chromium,
  expect,
} = require("../../mobile/node_modules/@playwright/test");
const { Pool } = require("pg");
const { hash } = require("bcryptjs");
const assert = require("node:assert/strict");
const db = new Pool({ connectionString: process.env.DATABASE_URL });
const tag = Date.now(),
  ids = [],
  password = "RealtimeUi123!";
let browser, vehicle, garage, service, appointment;
async function api(path, body, token) {
  const r = await fetch("http://localhost:3000" + path, {
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
(async () => {
  const digest = await hash(password, 4),
    accounts = [];
  for (const role of ["customer", "receptionist"]) {
    const email = `rt-ui-${tag}-${role}@example.com`;
    const u = (
      await db.query(
        "INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,$4) RETURNING id",
        [role, email, digest, role],
      )
    ).rows[0];
    ids.push(u.id);
    accounts.push({ email, ...u });
  }
  const plate = "RU" + String(tag).slice(-10);
  vehicle = (
    await db.query(
      "INSERT INTO vehicles(owner_id,plate,brand,model,year,odometer) VALUES($1,$2,'Toyota','Vios',2020,100) RETURNING id",
      [ids[0], plate],
    )
  ).rows[0].id;
  garage = (
    await db.query(
      "INSERT INTO garages(name,address) VALUES($1,'Test') RETURNING id",
      ["RT UI" + tag],
    )
  ).rows[0].id;
  service = (
    await db.query(
      "INSERT INTO services(name,price,duration,checklist) VALUES($1,100,60,'[]') RETURNING id",
      ["RT UI" + tag],
    )
  ).rows[0].id;
  browser = await chromium.launch({ channel: "msedge", headless: true });
  const pages = [],
    errors = [];
  for (const account of accounts) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://localhost:8083/login");
    await page
      .getByLabel("Email hoặc số điện thoại", { exact: true })
      .fill(account.email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
    await page
      .getByRole("button", { name: "Đăng nhập →", exact: true })
      .click();
    await expect(
      page.getByText("● Đang cập nhật trực tiếp", { exact: true }),
    ).toBeVisible({ timeout: 15000 });
    pages.push(page);
  }
  const [customer, reception] = pages;
  await reception.goto("http://localhost:8083/appointments");
  await reception
    .getByLabel("Tìm biển số, khách hàng hoặc mã lịch")
    .fill(plate);
  const token = (
    await api("/auth/login", { identifier: accounts[0].email, password })
  ).accessToken;
  const day = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
  const start = Date.now();
  appointment = (
    await api(
      "/appointments",
      {
        vehicle_id: vehicle,
        garage_id: garage,
        service_ids: [service],
        starts_at: day + "T09:00:00+07:00",
      },
      token,
    )
  ).id;
  await expect(
    reception.getByText(plate + " · #" + appointment, { exact: true }),
  ).toBeVisible({ timeout: 5000 });
  const bookingLatency = Date.now() - start;
  await customer.goto("http://localhost:8083/appointment?id=" + appointment);
  await expect(
    customer.getByText("Chờ xác nhận", { exact: true }),
  ).toBeVisible();
  await reception.goto("http://localhost:8083/appointment?id=" + appointment);
  const confirm = Date.now();
  await reception
    .getByRole("button", { name: "Xác nhận lịch hẹn", exact: true })
    .click();
  await expect(customer.getByText("Đã xác nhận", { exact: true })).toBeVisible({
    timeout: 5000,
  });
  const confirmLatency = Date.now() - confirm;
  await customer.goto("http://localhost:8083/notifications");
  const message = "Realtime message " + tag;
  await expect(
    customer.getByRole("button", {
      name: "Đánh dấu tất cả đã đọc",
      exact: true,
    }),
  ).toBeVisible();
  await db.query("INSERT INTO notifications(user_id,message) VALUES($1,$2)", [
    ids[0],
    message,
  ]);
  await expect(customer.getByText("● " + message, { exact: true })).toBeVisible(
    { timeout: 5000 },
  );
  await customer.screenshot({
    path: require("node:path").resolve(
      __dirname,
      "../../docs/test-results/realtime-notifications.png",
    ),
  });
  assert.deepEqual(errors, []);
  console.log(
    `PASS realtime UI: new booking ${bookingLatency}ms, confirmation ${confirmLatency}ms, notification without refresh; no runtime errors.`,
  );
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (browser) await browser.close();
    const c = await db.connect();
    try {
      await c.query("BEGIN");
      if (!appointment && ids[0])
        appointment = (
          await c.query("SELECT id FROM appointments WHERE customer_id=$1", [
            ids[0],
          ])
        ).rows[0]?.id;
      if (appointment) {
        for (const t of [
          "notifications",
          "events",
          "extras",
          "photos",
          "reviews",
        ])
          await c.query(`DELETE FROM ${t} WHERE appointment_id=$1`, [
            appointment,
          ]);
        await c.query("DELETE FROM appointments WHERE id=$1", [appointment]);
      }
      if (vehicle) await c.query("DELETE FROM vehicles WHERE id=$1", [vehicle]);
      if (garage) await c.query("DELETE FROM garages WHERE id=$1", [garage]);
      if (service) await c.query("DELETE FROM services WHERE id=$1", [service]);
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
