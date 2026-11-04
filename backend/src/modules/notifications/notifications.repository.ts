import { Inject, Injectable } from "@nestjs/common";
import { PoolClient } from "pg";
import { DatabaseService } from "../../database/database.service";
@Injectable()
export class NotificationsRepository {
  constructor(
    @Inject(DatabaseService)
    private readonly database: DatabaseService,
  ) {}
  transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    return this.database.transaction(fn);
  }
  listForUser(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "SELECT * FROM notifications WHERE user_id=$1 ORDER BY id DESC LIMIT 100",
      params,
    );
  }
  markAllRead(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "UPDATE notifications SET read=true WHERE user_id=$1",
      params,
    );
  }
}
