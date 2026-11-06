const assert = require("node:assert/strict");
const crypto = require("node:crypto");
require("dotenv").config({ quiet: true });
require("tsx/cjs");
const { Pool } = require("pg");
const { io } = require("socket.io-client");
const { createFirstAdmin } = require("../src/scripts/create-admin.ts");
const { db: bootstrapDb } = require("../src/database/connection.ts");
const db = new Pool({ connectionString: process.env.DATABASE_URL });
const base = process.env.TEST_API_URL || "http://127.0.0.1:3002";
const stamp = Date.now(),
  pass = "AdminTest!" + crypto.randomBytes(8).toString("hex");
const ids = [],
  catalog = { models: [], brands: [], types: [] },
  sockets = [];
let checks = 0;
async function req(u, method, p, b, status = 200) {
  const r = await fetch(base + p, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(u ? { Authorization: "Bearer " + u.accessToken } : {}),
    },
    body: b === undefined ? undefined : JSON.stringify(b),
  });
  const data = await r.json();
  if (status === 200)
    assert.ok(r.ok, `${method} ${p} => ${r.status}: ${JSON.stringify(data)}`);
  else
    assert.equal(r.status, status, `${method} ${p}: ${JSON.stringify(data)}`);
  checks++;
  return data;
}
const get = (u, p, s) => req(u, "GET", p, undefined, s),
  post = (u, p, b, s) => req(u, "POST", p, b, s),
  patch = (u, p, b, s) => req(u, "PATCH", p, b, s),
  del = (u, p, s) => req(u, "DELETE", p, undefined, s);
const fixture = (n, role = "user") => ({
  name: "QA " + n,
  email: `admin-qa-${stamp}-${n}@example.com`,
  password: pass,
  role,
});
const login = (f, admin = false) =>
  post(null, admin ? "/admin/auth/login" : "/auth/login", {
    identifier: f.email,
    password: pass,
  });
async function sock(u) {
  const s = io(base + "/realtime", {
    transports: ["websocket"],
    auth: { token: u.accessToken },
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
    /personal_admin_test$/,
    "Use isolated admin test DB only",
  );
  const first = fixture("root", "admin");
  process.env.ADMIN_EMAIL = first.email;
  process.env.ADMIN_PASSWORD = pass;
  process.env.ADMIN_NAME = first.name;
  await createFirstAdmin();
  let admin = await login(first, true);
  ids.push(admin.user.id);
  assert.equal(admin.user.role, "admin");
  await assert.rejects(createFirstAdmin(), /Đã có admin/);
  checks++;
  const uf = fixture("user"),
    user = await post(null, "/auth/register", { ...uf, role: "admin" });
  ids.push(user.user.id);
  assert.equal(user.user.role, "user");
  await post(
    null,
    "/auth/login",
    { identifier: first.email, password: pass },
    401,
  );
  await post(
    null,
    "/admin/auth/login",
    { identifier: uf.email, password: pass },
    401,
  );
  await get(null, "/admin/users", 401);
  for (const path of [
    "/admin/users",
    "/Admin/Users",
    "/ADMIN/DASHBOARD/",
    "/admin/vehicles",
    "/admin/audit-logs",
    "/admin/catalog/brands",
  ])
    await get(user, path, 403);
  await post(user, "/admin/users", fixture("denied"), 403);
  await patch(user, "/admin/users/" + user.user.id, { role: "admin" }, 403);
  await del(user, "/admin/users/" + admin.user.id, 403);
  await post(user, "/admin/catalog/brands", { name: "Denied" }, 403);
  for (const path of ["/vehicles", "/backup", "/dashboard", "/records"])
    await get(admin, path, 403);
  const me = await get(admin, "/auth/me");
  assert.equal(me.password_hash, undefined);
  const people = await get(admin, "/admin/users?page=1&page_size=1");
  assert.equal(people.items.length, 1);
  assert.ok(people.total >= 2);
  assert.equal(JSON.stringify(people).includes("password_hash"), false);
  assert.equal(
    (await get(admin, "/admin/users?q=" + encodeURIComponent(uf.email))).total,
    1,
  );
  assert.equal(
    (await get(admin, "/admin/users?q=" + encodeURIComponent("%' OR 1=1 --")))
      .total,
    0,
  );
  await get(admin, "/admin/users?page=0", 400);
  await get(admin, "/admin/users?page_size=101", 400);
  await get(admin, "/admin/users?active=oops", 400);
  await get(admin, "/admin/users?role=technician", 400);
  await get(admin, "/admin/users?page=1&page=2", 400);
  await get(admin, "/admin/users/not-an-id", 400);
  const detail = await get(admin, "/admin/users/" + user.user.id);
  assert.equal(detail.vehicles, 0);
  assert.equal(detail.email, uf.email);
  await get(admin, "/admin/users/999999999", 404);
  const ef = fixture("empty");
  const empty = await post(admin, "/admin/users", ef);
  ids.push(empty.id);
  assert.equal(empty.password_hash, undefined);
  assert.equal((await login(ef)).user.role, "user");
  await post(admin, "/admin/users", ef, 409);
  await post(
    admin,
    "/admin/users",
    { ...fixture("weak"), password: "123" },
    400,
  );
  await post(
    admin,
    "/admin/users",
    { ...fixture("extra"), owner_id: user.user.id },
    400,
  );
  await patch(admin, "/admin/users/" + empty.id, {
    name: "Đã đổi tên",
    phone: "0901234567",
  });
  await patch(admin, "/admin/users/" + empty.id, { email: "" }, 400);
  await patch(admin, "/admin/users/" + empty.id, { password: "Unsafe" }, 400);
  await patch(admin, "/admin/users/" + empty.id, { active: "false" }, 400);
  await patch(admin, "/admin/users/" + empty.id, {}, 400);
  await patch(admin, "/admin/users/" + admin.user.id, { active: false }, 400);
  await patch(admin, "/admin/users/" + admin.user.id, { role: "user" }, 400);
  await del(admin, "/admin/users/" + admin.user.id, 400);
  await del(admin, "/admin/users/" + empty.id);
  await get(admin, "/admin/users/" + empty.id, 404);
  const us = await sock(user);
  const expired = new Promise((resolve, reject) => {
    us.once("session:expired", resolve);
    us.once("disconnect", resolve);
    setTimeout(
      () => reject(Error("locked socket remained open")),
      5000,
    ).unref();
  });
  await patch(admin, "/admin/users/" + user.user.id, { active: false });
  await expired;
  checks++;
  await get(user, "/auth/me", 401);
  await post(
    null,
    "/auth/login",
    { identifier: uf.email, password: pass },
    401,
  );
  await patch(admin, "/admin/users/" + user.user.id, { active: true });
  await get(user, "/auth/me", 401);
  const fresh = await login(uf);
  const catList = await get(fresh, "/catalog/brands?page_size=100");
  assert.ok(catList.items.some((x) => x.name === "Honda"));
  await get(null, "/catalog/brands", 401);
  await get(fresh, "/catalog/unknown", 404);
  const create = async (kind, b) => {
    const x = await post(admin, "/admin/catalog/" + kind, b);
    catalog[kind].push(x.id);
    return x;
  };
  const brand = await create("brands", { name: "QA Brand " + stamp }),
    other = await create("brands", { name: "QA Other " + stamp }),
    type = await create("types", { name: "QA Type " + stamp }),
    model = await create("models", {
      name: "QA Model",
      brand_id: brand.id,
      type_id: type.id,
    });
  await post(
    admin,
    "/admin/catalog/brands",
    { name: brand.name.toLowerCase() },
    409,
  );
  await post(admin, "/admin/catalog/brands", { name: "" }, 400);
  await post(
    admin,
    "/admin/catalog/brands",
    { name: "Invalid", active: "true" },
    400,
  );
  await post(admin, "/admin/catalog/models", { name: "Bad model" }, 400);
  await post(
    admin,
    "/admin/catalog/models",
    { name: "Bad model", brand_id: 999999999 },
    404,
  );
  await post(
    admin,
    "/admin/catalog/models",
    { name: model.name, brand_id: brand.id },
    409,
  );
  assert.equal(
    (await get(fresh, "/catalog/models?brand_id=" + brand.id)).items.length,
    1,
  );
  const v = await post(fresh, "/vehicles", {
    brand_id: brand.id,
    model_id: model.id,
    odometer: 500,
  });
  assert.equal(v.brand, brand.name);
  assert.equal(v.model, model.name);
  assert.equal(v.type_id, type.id);
  await post(
    fresh,
    "/vehicles",
    { brand_id: other.id, model_id: model.id, odometer: 0 },
    400,
  );
  await post(fresh, "/vehicles", { model_id: model.id, odometer: 0 }, 400);
  await post(
    fresh,
    "/vehicles",
    {
      brand_id: brand.id,
      model_id: model.id,
      brand: "Wrong name",
      odometer: 0,
    },
    400,
  );
  const legacy = await post(fresh, "/vehicles", {
    brand: "Hãng tự nhập",
    model: "Dòng tự nhập",
    odometer: 0,
  });
  assert.equal(legacy.brand_id, null);
  const vehicles = await get(admin, "/admin/vehicles?owner_id=" + user.user.id);
  assert.equal(vehicles.total, 2);
  assert.equal(
    (await get(admin, "/admin/vehicles?brand_id=" + brand.id)).total,
    1,
  );
  assert.equal(
    (await get(admin, "/admin/vehicles?type_id=" + type.id)).total,
    1,
  );
  assert.equal(
    (await get(admin, "/admin/vehicles/" + v.id)).owner_email,
    uf.email,
  );
  assert.equal(
    (await get(admin, "/admin/vehicles/" + v.id + "/records")).total,
    0,
  );
  await patch(admin, "/admin/vehicles/" + v.id, { odometer: 1000 }, 404);
  await del(admin, "/admin/users/" + user.user.id, 400);
  await del(admin, "/admin/catalog/brands/" + brand.id, 400);
  await del(admin, "/admin/catalog/models/" + model.id, 400);
  await del(admin, "/admin/catalog/types/" + type.id, 400);
  await patch(
    admin,
    "/admin/catalog/models/" + model.id,
    { brand_id: other.id },
    400,
  );
  await patch(admin, "/admin/catalog/brands/" + brand.id, { active: false });
  assert.equal(
    (await get(fresh, "/catalog/models?brand_id=" + brand.id)).total,
    0,
  );
  assert.equal(
    (
      await get(
        fresh,
        "/catalog/brands?active=false&q=" + encodeURIComponent(brand.name),
      )
    ).total,
    0,
  );
  await post(
    fresh,
    "/vehicles",
    { brand_id: brand.id, model_id: model.id, odometer: 0 },
    400,
  );
  await patch(fresh, "/vehicles/" + v.id, { ...v, odometer: 501 });
  await patch(admin, "/admin/catalog/brands/" + brand.id, { active: true });
  const backup = await get(fresh, "/backup");
  await post(fresh, "/backup/restore", backup);
  const after = (await get(fresh, "/vehicles")).find(
    (x) => x.brand_id === brand.id,
  );
  assert.ok(after);
  assert.equal(after.model_id, model.id);
  assert.equal(after.type_id, type.id);
  const cats = await get(fresh, "/categories");
  await post(fresh, "/records", {
    vehicle_id: after.id,
    category_id: cats[0].id,
    performed_date: new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Bangkok",
    }),
    odometer: 501,
    cost: 100000,
    content: "Admin history read only",
  });
  assert.equal(
    (await get(admin, "/admin/vehicles/" + after.id + "/records")).total,
    1,
  );
  const overview = await get(admin, "/admin/dashboard");
  assert.ok(overview.users >= 1);
  assert.ok(overview.vehicles >= 2);
  assert.ok(overview.top_brands.some((x) => x.name === brand.name));
  const unused = await create("types", { name: "Delete me " + stamp });
  await del(admin, "/admin/catalog/types/" + unused.id);
  await get(admin, "/admin/catalog/types?active=false");
  const logs = await get(admin, "/admin/audit-logs?page_size=100");
  assert.ok(logs.items.some((x) => x.action === "user.create"));
  assert.ok(logs.items.some((x) => x.action === "catalog.update"));
  assert.equal(JSON.stringify(logs).includes(pass), false);
  assert.equal(JSON.stringify(logs).includes("password_hash"), false);
  const af = fixture("second", "admin"),
    a2 = await post(admin, "/admin/users", af);
  ids.push(a2.id);
  const second = await login(af, true);
  const as = await sock(admin),
    bs = await sock(fresh);
  const ae = [],
    be = [];
  as.on("data:changed", (e) => ae.push(e));
  bs.on("data:changed", (e) => be.push(e));
  await new Promise((r) => setTimeout(r, 200));
  await patch(admin, "/admin/catalog/models/" + model.id, {
    name: "QA Model Updated",
  });
  await new Promise((r) => setTimeout(r, 400));
  assert.ok(ae.some((e) => e.resources.includes("catalog")));
  assert.ok(be.some((e) => e.resources.includes("catalog")));
  checks++;
  // Both requests can pass initial guard, but only one admin may remove the other's role.
  const renamed = await get(
    admin,
    "/admin/vehicles?q=" + encodeURIComponent("QA Model Updated"),
  );
  assert.equal(renamed.total, 1);
  assert.equal(renamed.items[0].catalog_model_name, "QA Model Updated");
  const races = await Promise.all(
    [
      [admin, a2.id],
      [second, admin.user.id],
    ].map(async ([actor, id]) => {
      const r = await fetch(base + "/admin/users/" + id, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + actor.accessToken,
        },
        body: JSON.stringify({ role: "user" }),
      });
      return r.status;
    }),
  );
  assert.equal(races.filter((x) => x === 200).length, 1);
  assert.ok(races.some((x) => x === 401 || x === 403));
  checks++;
  assert.equal(
    (
      await db.query(
        "SELECT count(*)::int n FROM users WHERE role='admin' AND active=true",
      )
    ).rows[0].n,
    1,
  );
  console.log(
    `PASS ${checks} admin API/security/catalog checks; isolated database only.`,
  );
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    for (const s of sockets) s.disconnect();
    for (const id of ids) {
      await db.query("DELETE FROM notifications WHERE user_id=$1", [id]);
      for (const t of [
        "records",
        "plans",
        "vehicles",
        "categories",
        "settings",
      ])
        await db.query(`DELETE FROM ${t} WHERE owner_id=$1`, [id]);
      await db.query("DELETE FROM users WHERE id=$1", [id]);
    }
    for (const [kind, table] of [
      ["models", "vehicle_models"],
      ["brands", "vehicle_brands"],
      ["types", "vehicle_types"],
    ])
      await db.query(`DELETE FROM ${table} WHERE id=ANY($1::int[])`, [
        catalog[kind],
      ]);
    await db.query("DELETE FROM admin_audit_logs WHERE actor_id IS NULL");
    await db.end();
    await bootstrapDb.end();
  });
