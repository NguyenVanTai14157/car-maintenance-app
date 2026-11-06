import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Pool, types } from "pg";
import { createHash } from "node:crypto";
types.setTypeParser(1082, (value) => value);
export const db = new Pool({ connectionString: process.env.DATABASE_URL });
export async function migrate() {
  const directory = join(__dirname, "../../migrations");
  await transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(9099,0)");
    const old = await client.query(
      "SELECT to_regclass('public.appointments') legacy",
    );
    if (old.rows[0].legacy)
      throw Error(
        "Database này thuộc bản gara. Hãy dùng database riêng car_maintenance_personal; dữ liệu cũ không được chuyển tự động.",
      );
    await client.query(
      "CREATE TABLE IF NOT EXISTS schema_migrations(version TEXT PRIMARY KEY,checksum TEXT NOT NULL,applied_at TIMESTAMPTZ NOT NULL DEFAULT now())",
    );
    for (const file of readdirSync(directory)
      .filter((f) => f.endsWith(".sql"))
      .sort()) {
      const sql = readFileSync(join(directory, file), "utf8"),
        checksum = createHash("sha256")
          .update(sql.replace(/\r\n/g, "\n"))
          .digest("hex");
      const applied = (
        await client.query(
          "SELECT checksum FROM schema_migrations WHERE version=$1",
          [file],
        )
      ).rows[0];
      if (applied) {
        if (applied.checksum !== checksum)
          throw Error(
            "Migration đã áp dụng bị sửa: " + file + ". Hãy tạo migration mới.",
          );
        continue;
      }
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations(version,checksum) VALUES($1,$2)",
        [file, checksum],
      );
    }
  });
}
export async function transaction<T>(
  fn: (client: any) => Promise<T>,
): Promise<T> {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
