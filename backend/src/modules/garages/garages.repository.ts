import { Inject, Injectable } from "@nestjs/common";
import { PoolClient } from "pg";
import { DatabaseService } from "../../database/database.service";
@Injectable()
export class GaragesRepository {
  constructor(
    @Inject(DatabaseService)
    private readonly database: DatabaseService,
  ) {}
  transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    return this.database.transaction(fn);
  }
  list(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "SELECT * FROM garages ORDER BY id",
      params,
    );
  }
  insert(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "INSERT INTO garages(name,address) VALUES($1,$2) RETURNING *",
      params,
    );
  }
  update(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "UPDATE garages SET name=$1,address=$2,open_hour=$3,close_hour=$4,capacity=$5,cancel_hours=$6,reminder_hours=$7,notification_template=$8,active=$9 WHERE id=$10 RETURNING *",
      params,
    );
  }
}
