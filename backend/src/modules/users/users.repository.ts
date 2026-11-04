import { Inject, Injectable } from "@nestjs/common";
import { PoolClient } from "pg";
import { DatabaseService } from "../../database/database.service";
@Injectable()
export class UsersRepository {
  constructor(
    @Inject(DatabaseService)
    private readonly database: DatabaseService,
  ) {}
  transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    return this.database.transaction(fn);
  }
  listStaff(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "SELECT id,name,role,active FROM users WHERE role IN ('technician','receptionist') ORDER BY name",
      params,
    );
  }
  listUsers(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "SELECT id,name,email,phone,role,active,created_at FROM users ORDER BY id DESC",
      params,
    );
  }
  insertStaff(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "INSERT INTO users(name,email,phone,role,password_hash) VALUES($1,$2,$3,$4,$5) RETURNING *",
      params,
    );
  }
  lockAccountChanges(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "SELECT pg_advisory_xact_lock(9071)",
      params,
    );
  }
  lockUser(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "SELECT * FROM users WHERE id=$1 FOR UPDATE",
      params,
    );
  }
  findTechnicianActiveJobs(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "SELECT id FROM appointments WHERE technician_id=$1 AND status NOT IN ('completed','cancelled','rejected')",
      params,
    );
  }
  findCustomerActiveVisits(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "SELECT id FROM appointments WHERE customer_id=$1 AND status NOT IN ('completed','cancelled','rejected')",
      params,
    );
  }
  revokeSessions(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "DELETE FROM sessions WHERE user_id=$1",
      params,
    );
  }
  updateUser(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "UPDATE users SET name=$1,email=$2,phone=$3,role=$4,active=$5 WHERE id=$6 RETURNING *",
      params,
    );
  }
}
