const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
require("dotenv").config({ quiet: true });
const { Pool } = require("pg");
const name = "car_maintenance_personal_admin_migration_" + Date.now();
assert.match(name, /^car_maintenance_personal_admin_migration_\d+$/);
const url = new URL(process.env.DATABASE_URL);
assert.match(url.pathname, /personal_admin_test$/);
url.pathname = "/postgres";
const control = new Pool({ connectionString: url.toString() });
let db,
  created = false;
(async () => {
  await control.query("CREATE DATABASE " + name);
  created = true;
  url.pathname = "/" + name;
  db = new Pool({ connectionString: url.toString() });
  await db.query(
    fs.readFileSync(
      path.resolve(__dirname, "../migrations/001_personal.sql"),
      "utf8",
    ),
  );
  const u = (
    await db.query(
      "INSERT INTO users(name,email,password_hash) VALUES('Legacy user','migration@example.com','fixture-not-used') RETURNING id",
    )
  ).rows[0];
  await db.query(
    "INSERT INTO vehicles(owner_id,brand,model,odometer,notes) VALUES($1,'Toyota','Vios',35000,'Original note'),($1,'Custom brand','Custom model',120,'Unmatched text')",
    [u.id],
  );
  await db.query(
    "INSERT INTO sessions(id,user_id,expires_at) VALUES('legacy-session',$1,now()+interval '1 day')",
    [u.id],
  );
  const before = (
    await db.query(
      "SELECT id,brand,model,odometer,notes FROM vehicles ORDER BY id",
    )
  ).rows;
  const code =
    "require('tsx/cjs'); const {migrate,db}=require('./src/database/connection.ts');migrate().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>db.end());";
  const run = () =>
    execFileSync(process.execPath, ["-e", code], {
      cwd: path.resolve(__dirname, ".."),
      env: { ...process.env, DATABASE_URL: url.toString() },
      stdio: "pipe",
    });
  run();
  const after = (await db.query("SELECT * FROM vehicles ORDER BY id")).rows;
  assert.deepEqual(
    after.map(({ id, brand, model, odometer, notes }) => ({
      id,
      brand,
      model,
      odometer,
      notes,
    })),
    before,
  );
  assert.ok(after[0].brand_id);
  assert.ok(after[0].model_id);
  assert.ok(after[0].type_id);
  assert.equal(after[1].brand_id, null);
  assert.equal(
    (await db.query("SELECT count(*)::int n FROM sessions")).rows[0].n,
    1,
  );
  assert.equal(
    (await db.query("SELECT count(*)::int n FROM categories")).rows[0].n,
    4,
  );
  await db.query(
    "UPDATE vehicle_brands SET name='Toyota Renamed' WHERE name='Toyota'",
  );
  run();
  assert.equal(
    (
      await db.query(
        "SELECT count(*)::int n FROM vehicle_brands WHERE name='Toyota'",
      )
    ).rows[0].n,
    0,
  );
  assert.equal(
    (await db.query("SELECT count(*)::int n FROM schema_migrations")).rows[0].n,
    fs
      .readdirSync(path.resolve(__dirname, "../migrations"))
      .filter((file) => file.endsWith(".sql")).length,
  );
  console.log(
    "PASS migration from personal schema: data/session preserved, exact legacy links, unmatched text kept, migrations idempotent and seed runs once.",
  );
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (db) await db.end();
    if (created) await control.query("DROP DATABASE " + name);
    await control.end();
  });
