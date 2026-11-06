const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto"),
  assert = require("node:assert/strict");
const { chromium, expect } = require("@playwright/test");
require("../../backend/node_modules/dotenv").config({
  path: path.resolve(__dirname, "../../backend/.env"),
  quiet: true,
});
const { Pool } = require("../../backend/node_modules/pg");
const db = new Pool({ connectionString: process.env.DATABASE_URL });
const WEB = process.env.TEST_WEB_URL || "http://localhost:3001",
  API = process.env.TEST_API_URL || "http://127.0.0.1:3000";
const stamp = Date.now(),
  prefix = "web-qa-" + stamp,
  secret = "Qa!" + crypto.randomBytes(10).toString("hex"),
  adminEmail = prefix + "-admin@example.com",
  userEmail = prefix + "-user@example.com";
const createdUsers = [],
  catalog = { brands: [], models: [], types: [] },
  mail = [];
const out = path.resolve(__dirname, "../../docs/test-results/admin-web");
fs.mkdirSync(out, { recursive: true });
let browser,
  count = 0;
async function api(p, method = "GET", body, token) {
  const r = await fetch(API + p, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw Error(p + ": " + r.status + " " + JSON.stringify(data));
  return data;
}
(async () => {
  const access = fs.readFileSync(
    path.resolve(__dirname, "../../.local-backups/admin-web-access.md"),
    "utf8",
  );
  const rootEmail = access.match(/- Email: (.+)/)[1],
    rootPassword = access.match(/- Mật khẩu: (.+)/)[1];
  const root = await api("/admin/auth/login", "POST", {
    identifier: rootEmail,
    password: rootPassword,
  });
  const admin = await api(
    "/admin/users",
    "POST",
    {
      name: "Quản trị kiểm thử",
      email: adminEmail,
      password: secret,
      role: "admin",
    },
    root.accessToken,
  );
  createdUsers.push(admin.id);
  await api("/auth/logout", "POST", {}, root.accessToken);
  browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    }),
    page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const click = async (t) => {
      const exact = page.getByRole("button", { name: t, exact: true });
      if (await exact.count()) await exact.first().click();
      else
        await page
          .getByRole("button", {
            name: new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
          })
          .first()
          .click();
    },
    show = (t) =>
      expect(
        page.getByText(t, { exact: true }).filter({ visible: true }).first(),
      ).toBeVisible({ timeout: 20000 }),
    field = (t, v) =>
      page.getByLabel(t, { exact: true }).filter({ visible: true }).fill(v);
  await page.goto(WEB + "/users");
  await expect(page).toHaveURL(/\/login/);
  count++;
  await page.screenshot({
    path: path.join(out, "01-login.png"),
    fullPage: true,
  });
  const denied = await context.request.post(WEB + "/api/auth/login", {
    headers: { Origin: "https://invalid.example" },
    data: { identifier: adminEmail, password: secret },
  });
  assert.equal(denied.status(), 403);
  count++;
  await field("Email quản trị", adminEmail);
  await field("Mật khẩu", "incorrect");
  await click("Đăng nhập");
  await show("Thông tin đăng nhập không đúng hoặc tài khoản bị khóa.");
  count++;
  await field("Mật khẩu", secret);
  const loginResponse = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/auth/login") && r.request().method() === "POST",
  );
  await click("Đăng nhập");
  const loginData = await (await loginResponse).json();
  assert.equal(loginData.accessToken, undefined);
  await expect(page).toHaveURL(WEB + "/");
  await show("Tổng quan hệ thống");
  const cookie = (await context.cookies()).find(
    (c) => c.name === "autocare.admin.session",
  );
  assert.ok(cookie.httpOnly);
  count++;
  await page.goto(WEB + "/users");
  await click("Thêm người dùng");
  await field("Họ và tên", "Người dùng kiểm thử");
  await field("Email", userEmail);
  await field("Mật khẩu ban đầu", secret);
  await click("Tạo tài khoản");
  await show("Đã tạo người dùng.");
  count++;
  const adminLogin = await api("/admin/auth/login", "POST", {
    identifier: adminEmail,
    password: secret,
  });
  let user = (
    await api(
      "/admin/users?q=" + encodeURIComponent(userEmail),
      "GET",
      undefined,
      adminLogin.accessToken,
    )
  ).items[0];
  createdUsers.push(user.id);
  await page
    .getByPlaceholder("Tìm tên, email hoặc số điện thoại")
    .fill(userEmail);
  await click("Tìm");
  await show(userEmail);
  await click("Sửa " + userEmail);
  await field("Họ và tên", "Người dùng đã sửa");
  await click("Lưu thay đổi");
  await show("Người dùng đã sửa");
  count++;
  await click("Khóa " + userEmail);
  await click("Xác nhận");
  await show("Đã khóa tài khoản.");
  await click("Mở khóa " + userEmail);
  await click("Xác nhận");
  await show("Đã mở khóa tài khoản.");
  count++;
  await click("Xem " + userEmail);
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("button", { name: "Close", exact: true })
    .click()
    .catch(() =>
      page.getByRole("button", { name: "Đóng", exact: true }).click(),
    );
  const brandName = "QA Brand " + stamp,
    typeName = "QA Type " + stamp,
    modelName = "QA Model " + stamp;
  for (const [kind, title, name] of [
    ["brands", "hãng xe", brandName],
    ["types", "loại xe", typeName],
  ]) {
    await page.goto(WEB + "/catalog/" + kind);
    await click("Thêm " + title);
    await field("Tên " + title, name);
    await click("Lưu danh mục");
    await show(name);
    const item = (
      await api(
        "/admin/catalog/" + kind + "?q=" + encodeURIComponent(name),
        "GET",
        undefined,
        adminLogin.accessToken,
      )
    ).items[0];
    catalog[kind].push(item.id);
    count++;
  }
  await page.goto(WEB + "/catalog/models");
  await click("Thêm dòng xe");
  await field("Tên dòng xe", modelName);
  await page.getByLabel("Hãng xe", { exact: true }).click();
  await page
    .getByText(brandName, { exact: true })
    .filter({ visible: true })
    .last()
    .click();
  await page.getByLabel("Loại xe", { exact: true }).click();
  await page
    .getByText(typeName, { exact: true })
    .filter({ visible: true })
    .last()
    .click();
  await click("Lưu danh mục");
  await show(modelName);
  const model = (
    await api(
      "/admin/catalog/models?q=" + encodeURIComponent(modelName),
      "GET",
      undefined,
      adminLogin.accessToken,
    )
  ).items[0];
  catalog.models.push(model.id);
  count++;
  const userLogin = await api("/auth/login", "POST", {
    identifier: userEmail,
    password: secret,
  });
  const plate = "W" + String(stamp).slice(-8),
    vehicle = await api(
      "/vehicles",
      "POST",
      {
        brand_id: catalog.brands[0],
        model_id: model.id,
        odometer: 12000,
        plate,
      },
      userLogin.accessToken,
    ),
    cats = await api("/categories", "GET", undefined, userLogin.accessToken);
  await api(
    "/records",
    "POST",
    {
      vehicle_id: vehicle.id,
      category_id: cats[0].id,
      performed_date: new Date().toLocaleDateString("en-CA", {
        timeZone: "Asia/Bangkok",
      }),
      odometer: 12000,
      cost: 650000,
      content: "Bảo dưỡng kiểm thử web",
    },
    userLogin.accessToken,
  );
  await page.goto(WEB + "/vehicles");
  await page.getByPlaceholder("Tìm biển số, hãng xe, chủ sở hữu").fill(plate);
  await click("Tìm");
  await show(plate);
  await click("Xem xe " + plate);
  await show("Lịch sử bảo dưỡng");
  await show("Bảo dưỡng kiểm thử web");
  await show("650.000 ₫");
  await page.screenshot({
    path: path.join(out, "03-vehicle-history.png"),
    fullPage: true,
  });
  count++;
  await page.goto(WEB + "/users");
  await page
    .getByPlaceholder("Tìm tên, email hoặc số điện thoại")
    .fill(userEmail);
  await click("Tìm");
  await click("Xóa " + userEmail);
  await click("Xóa");
  await show(
    "Người dùng đã có dữ liệu xe hoặc bảo dưỡng. Hãy khóa tài khoản để giữ lịch sử.",
  );
  count++;
  await page.screenshot({
    path: path.join(out, "02-users.png"),
    fullPage: true,
  });
  await page.goto(WEB + "/audit-logs");
  await show("Nhật ký quản trị");
  await expect(
    page
      .getByText("Thêm người dùng", { exact: true })
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  count++;
  // A regular user's JWT cannot bypass admin authorization by being placed in the cookie.
  const forbiddenContext = await browser.newContext();
  await forbiddenContext.addCookies([
    {
      name: "autocare.admin.session",
      value: userLogin.accessToken,
      url: WEB,
      httpOnly: true,
    },
  ]);
  const forbidden = await forbiddenContext.request.get(
    WEB + "/api/admin/users",
  );
  assert.equal(forbidden.status(), 403);
  await forbiddenContext.close();
  count++;
  await page.goto(WEB + "/account");
  await field("Họ và tên", "Quản trị viên đã sửa");
  await click("Lưu thông tin");
  await show("Đã cập nhật thông tin cá nhân.");
  await field("Mật khẩu hiện tại", secret);
  await field("Mật khẩu mới", secret + "New");
  await field("Nhập lại mật khẩu mới", secret + "New");
  await click("Đổi mật khẩu");
  await show("Đã đổi mật khẩu. Các phiên khác đã kết thúc.");
  count++;
  await click("Đăng xuất");
  await page
    .getByRole("button", { name: "Đăng xuất", exact: true })
    .last()
    .click();
  await expect(page).toHaveURL(/\/login/);
  await page.getByRole("link", { name: "Quên mật khẩu?" }).click();
  await field("Email khôi phục", adminEmail);
  await click("Gửi hướng dẫn khôi phục");
  await show(
    "Nếu email đã được đăng ký, hướng dẫn khôi phục sẽ được gửi đến email đó.",
  );
  const dir = path.resolve(__dirname, "../../.local-backups/mail-preview");
  const found = fs
    .readdirSync(dir)
    .filter((n) => n.endsWith(".json"))
    .map((n) => ({
      file: path.join(dir, n),
      data: JSON.parse(fs.readFileSync(path.join(dir, n), "utf8")),
    }))
    .find((x) => x.data.to === adminEmail);
  assert.ok(found);
  mail.push(found.file);
  await page.getByRole("link", { name: "Tôi đã có mã khôi phục →" }).click();
  await field("Mã khôi phục", found.data.token);
  await field("Mật khẩu mới", secret + "Reset");
  await field("Nhập lại mật khẩu mới", secret + "Reset");
  await click("Đặt lại mật khẩu");
  await show("Đã đổi mật khẩu. Vui lòng đăng nhập lại trên các thiết bị.");
  count++;
  await page.getByRole("link", { name: "← Về đăng nhập" }).click();
  await field("Email quản trị", adminEmail);
  await field("Mật khẩu", secret + "Reset");
  await click("Đăng nhập");
  await show("Tổng quan hệ thống");
  await page.screenshot({
    path: path.join(out, "04-dashboard.png"),
    fullPage: true,
  });
  count++;
  await page.setViewportSize({ width: 390, height: 844 });
  await click("Mở menu");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.screenshot({
    path: path.join(out, "05-mobile-menu.png"),
    fullPage: true,
  });
  assert.equal(errors.length, 0, errors.join("\n"));
  count++;
  console.log(
    `PASS ${count} admin web workflows: real API/DB, HttpOnly cookie, CSRF, user/catalog/vehicle/history/audit/account/recovery/responsive; no browser runtime errors.`,
  );
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (browser) await browser.close();
    const extra = (
      await db.query("SELECT id,email FROM users WHERE email LIKE $1", [
        prefix + "%@example.com",
      ])
    ).rows;
    for (const u of extra) {
      assert.ok(u.email.startsWith(prefix));
      if (!createdUsers.includes(u.id)) createdUsers.push(u.id);
      await db.query("DELETE FROM notifications WHERE user_id=$1", [u.id]);
      for (const table of [
        "records",
        "plans",
        "vehicles",
        "categories",
        "settings",
      ])
        await db.query(`DELETE FROM ${table} WHERE owner_id=$1`, [u.id]);
      await db.query("DELETE FROM users WHERE id=$1", [u.id]);
    }
    for (const [kind, table] of [
      ["models", "vehicle_models"],
      ["brands", "vehicle_brands"],
      ["types", "vehicle_types"],
    ]) {
      const x = (
        await db.query(`SELECT id FROM ${table} WHERE name LIKE $1`, [
          "QA " +
            (kind === "models"
              ? "Model"
              : kind === "brands"
                ? "Brand"
                : "Type") +
            " " +
            stamp +
            "%",
        ])
      ).rows.map((x) => x.id);
      catalog[kind].push(...x);
      await db.query(`DELETE FROM ${table} WHERE id=ANY($1::int[])`, [
        catalog[kind],
      ]);
      await db.query(
        "DELETE FROM admin_audit_logs WHERE entity=$1 AND target_id=ANY($2::int[])",
        [table, catalog[kind]],
      );
    }
    await db.query(
      "DELETE FROM admin_audit_logs WHERE entity='users' AND target_id=ANY($1::int[])",
      [createdUsers],
    );
    for (const file of mail) fs.rmSync(file, { force: true });
    await db.end();
  });
