import { Inject, Injectable } from "@nestjs/common";
import jwt from "jsonwebtoken";
import { DatabaseService } from "../../database/database.service";
@Injectable()
export class RealtimeAuthService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}
  async authenticate(token: unknown) {
    if (typeof token !== "string" || token.length > 4096)
      throw Error("Invalid session");
    const payload = jwt.verify(token, process.env.JWT_SECRET!, {
      algorithms: ["HS256"],
    }) as jwt.JwtPayload;
    const result = await this.database.query(
      "SELECT u.id,u.role FROM users u JOIN sessions s ON s.user_id=u.id WHERE u.id=$1 AND s.id=$2 AND s.expires_at>now() AND u.active=true",
      [payload.sub, payload.sid],
    );
    if (!result.rows[0]) throw Error("Invalid session");
    return result.rows[0] as { id: number; role: string };
  }
}
