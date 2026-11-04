import { Inject, Injectable } from "@nestjs/common";
import { PoolClient } from "pg";
import { DatabaseService } from "../../database/database.service";
@Injectable()
export class VehiclesRepository {
  constructor(
    @Inject(DatabaseService)
    private readonly database: DatabaseService,
  ) {}
  transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    return this.database.transaction(fn);
  }
  listVisible(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "SELECT v.*,u.name owner_name FROM vehicles v JOIN users u ON u.id=v.owner_id WHERE $1 OR owner_id=$2 ORDER BY v.id DESC",
      params,
    );
  }
  findOwned(params: any[] = [], client?: PoolClient, id?: number) {
    return (client || this.database).query(
      "SELECT * FROM vehicles WHERE id=$1 AND owner_id=$2 FOR UPDATE",
      params,
    );
  }
  save(params: any[] = [], client?: PoolClient, id?: number) {
    return (client || this.database).query(
      id
        ? "UPDATE vehicles SET plate=$1,brand=$2,model=$3,year=$4,odometer=$5 WHERE id=$6 AND owner_id=$7 RETURNING *"
        : "INSERT INTO vehicles(plate,brand,model,year,odometer,owner_id) VALUES($1,$2,$3,$4,$5,$6) RETURNING *",
      params,
    );
  }
}
