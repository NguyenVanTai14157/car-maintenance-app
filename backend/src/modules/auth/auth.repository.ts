import { Inject, Injectable } from "@nestjs/common";
import { PoolClient } from "pg";
import { DatabaseService } from "../../database/database.service";
@Injectable()
export class AuthRepository {
  constructor(
    @Inject(DatabaseService)
    private readonly database: DatabaseService,
  ) {}
  findSessionUser(params: any[]) {
    return this.database.query(
      "SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.id WHERE u.id=$1 AND s.id=$2 AND s.expires_at>now() AND u.active=true",
      params,
    );
  }
  transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    return this.database.transaction(fn);
  }
  insertSession(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "INSERT INTO sessions VALUES($1,$2,now()+interval '7 days')",
      params,
    );
  }
  insertUser(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "INSERT INTO users(name,email,phone,password_hash) VALUES($1,$2,$3,$4) RETURNING *",
      params,
    );
  }
  findByIdentifier(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "SELECT * FROM users WHERE email=$1 OR phone=$1",
      params,
    );
  }
  deleteSession(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "DELETE FROM sessions WHERE id=$1",
      params,
    );
  }
  updateProfile(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "UPDATE users SET name=$1,email=$2,phone=$3,avatar=$4 WHERE id=$5 RETURNING *",
      params,
    );
  }
  findUser(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "SELECT * FROM users WHERE id=$1",
      params,
    );
  }
  updatePassword(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "UPDATE users SET password_hash=$1 WHERE id=$2",
      params,
    );
  }
  revokeOtherSessions(params: any[] = [], client?: PoolClient) {
    return (client || this.database).query(
      "DELETE FROM sessions WHERE user_id=$1 AND id<>$2",
      params,
    );
  }
}
