import { Inject, Injectable } from "@nestjs/common";
import { PoolClient } from "pg";
import { DatabaseService } from "../../database/database.service";
@Injectable()
export class ServicesRepository {
  constructor(
    @Inject(DatabaseService)
    private readonly database: DatabaseService,
  ) {}
  transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    return this.database.transaction(fn);
  }
  listVisible(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "SELECT * FROM services WHERE active=true OR $1 ORDER BY id",
      params,
    );
  }
  save(params: any[] = [], client?: PoolClient, id?: number) {
    return (client || this.database).query(
      id
        ? "UPDATE services SET name=$1,description=$2,price=$3,duration=$4,checklist=$5,active=$6 WHERE id=$7 RETURNING *"
        : "INSERT INTO services(name,description,price,duration,checklist,active) VALUES($1,$2,$3,$4,$5,$6) RETURNING *",
      params,
    );
  }
}
