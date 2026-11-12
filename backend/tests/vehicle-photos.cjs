const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
require("dotenv").config({ quiet: true });
require("tsx/cjs");
const { Pool } = require("pg");
const { migrate, db: migrationDb } = require("../src/database/connection.ts");
const db = new Pool({ connectionString: process.env.DATABASE_URL });
const base = process.env.TEST_API_URL || "http://127.0.0.1:3000";
const stamp = Date.now(),
  users = [];
const one =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aIZkAAAAASUVORK5CYII=";
const two =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==";
let count = 0;
let a, b;
async function api(token, method, route, body, status = 200) {
  const response = await fetch(base + route, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  assert.equal(response.status, status, data.message || route);
  count++;
  return data;
}
(async () => {
  assert.match(new URL(process.env.DATABASE_URL).pathname, /personal/);
  // Roll back a temporary schema: the old image must survive migration to a gallery.
  const client = await db.connect();
  try {
    const schema = `vehicle_photo_migration_${stamp}`;
    assert.match(schema, /^vehicle_photo_migration_\d+$/);
    await client.query("BEGIN");
    await client.query(`CREATE SCHEMA ${schema}`);
    await client.query(`SET LOCAL search_path TO ${schema}`);
    await client.query(
      fs.readFileSync(
        path.join(__dirname, "../migrations/001_personal.sql"),
        "utf8",
      ),
    );
    const user = (
      await client.query(
        "INSERT INTO users(name,email,password_hash) VALUES('Photo migration','photo-migration@example.com','test-only') RETURNING id",
      )
    ).rows[0];
    await client.query(
      "INSERT INTO vehicles(owner_id,brand,model,odometer,image) VALUES($1,'Legacy','Car',100,$2)",
      [user.id, one],
    );
    const sql = fs.readFileSync(
      path.join(__dirname, "../migrations/004_vehicle_photos.sql"),
      "utf8",
    );
    await client.query(sql);
    await client.query(sql);
    const legacy = (await client.query("SELECT image,images FROM vehicles"))
      .rows[0];
    assert.deepEqual(legacy, { image: one, images: [one] });
    count++;
  } finally {
    await client.query("ROLLBACK");
    client.release();
  }
  await migrate();
  for (const suffix of ["a", "b"]) {
    const u = await api(
      null,
      "POST",
      "/auth/register",
      {
        name: "Vehicle photo test",
        email: `vehicle-photos-${stamp}-${suffix}@example.com`,
        password: "PhotoTest!123",
      },
      201,
    );
    users.push(u.user.id);
    if (suffix === "a") a = u;
    else b = u;
  }
  const body = {
    brand: "Toyota",
    model: "Vios",
    odometer: 12000,
    notes: "Photo test",
  };
  let v = await api(
    a.accessToken,
    "POST",
    "/vehicles",
    { ...body, images: [one, two, one] },
    201,
  );
  assert.deepEqual(v.images, [one, two]);
  assert.equal(v.image, one);
  v = await api(a.accessToken, "PATCH", `/vehicles/${v.id}`, {
    ...body,
    image: one,
  });
  assert.deepEqual(v.images, [one, two]);
  v = await api(a.accessToken, "PATCH", `/vehicles/${v.id}`, {
    ...body,
    images: [two],
  });
  assert.deepEqual(v.images, [two]);
  assert.equal(v.image, two);
  // An old client editing notes must not erase the gallery.
  v = await api(a.accessToken, "PATCH", `/vehicles/${v.id}`, {
    ...body,
    image: two,
    notes: "Old client edit",
  });
  assert.deepEqual(v.images, [two]);
  const legacyVehicle = await api(
    a.accessToken,
    "POST",
    "/vehicles",
    { ...body, image: one },
    201,
  );
  assert.deepEqual(legacyVehicle.images, [one]);
  const before = await api(a.accessToken, "GET", "/vehicles");
  await api(
    a.accessToken,
    "PATCH",
    `/vehicles/${v.id}`,
    { ...body, images: ["not-an-image"] },
    400,
  );
  await api(
    a.accessToken,
    "PATCH",
    `/vehicles/${v.id}`,
    { ...body, images: Array(11).fill(one) },
    400,
  );
  await api(
    b.accessToken,
    "PATCH",
    `/vehicles/${v.id}`,
    { ...body, images: [] },
    404,
  );
  assert.deepEqual(await api(a.accessToken, "GET", "/vehicles"), before);
  const backup = await api(a.accessToken, "GET", "/backup");
  await api(a.accessToken, "POST", "/backup/restore", backup, 201);
  let restored = await api(a.accessToken, "GET", "/vehicles");
  assert.deepEqual(
    restored
      .map((x) => x.images)
      .flat()
      .sort(),
    [one, two].sort(),
  );
  // Legacy backup files only contain the old single-photo field.
  const oldBackup = await api(a.accessToken, "GET", "/backup");
  oldBackup.vehicles.forEach((x) => {
    delete x.images;
  });
  await api(a.accessToken, "POST", "/backup/restore", oldBackup, 201);
  restored = await api(a.accessToken, "GET", "/vehicles");
  assert.ok(
    restored.every((x) => x.images.length === 1 && x.image === x.images[0]),
  );
  v = await api(a.accessToken, "PATCH", `/vehicles/${restored[0].id}`, {
    ...body,
    images: [],
  });
  assert.deepEqual(v.images, []);
  assert.equal(v.image, "");
  console.log(`PASS ${count} vehicle-photo API/migration/backup checks`);
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    for (const id of users) {
      await db.query("DELETE FROM notifications WHERE user_id=$1", [id]);
      for (const table of [
        "records",
        "plans",
        "vehicles",
        "categories",
        "settings",
      ])
        await db.query(`DELETE FROM ${table} WHERE owner_id=$1`, [id]);
      await db.query("DELETE FROM users WHERE id=$1", [id]);
    }
    await db.end();
    await migrationDb.end();
  });
