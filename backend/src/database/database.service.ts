import { Injectable, OnApplicationShutdown } from "@nestjs/common";
import { db, migrate, transaction } from "./connection";
@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  query(sql: string, params: any[] = []) {
    return db.query(sql, params);
  }
  transaction: typeof transaction = transaction;
  migrate() {
    return migrate();
  }
  async onApplicationShutdown() {
    await db.end();
  }
}
