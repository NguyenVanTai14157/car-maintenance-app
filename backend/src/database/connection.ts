import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";
export const db = new Pool({ connectionString: process.env.DATABASE_URL });
export async function migrate() {
  const directory = join(__dirname, "../../migrations");
  for (const file of readdirSync(directory)
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await db.query(readFileSync(join(directory, file), "utf8"));
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
