import {
  HttpException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { compare, hash } from "bcryptjs";
import jwt from "jsonwebtoken";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { AuthenticatedRequest } from "../../common/types/authenticated-request";
import {
  contact,
  fail,
  imageData,
  password,
  publicUser,
  text,
} from "../../common/validation/input";
import type { AuthInput } from "./dto/input.dto";
import { Inject } from "@nestjs/common";
import { AuthRepository } from "./auth.repository";
@Injectable()
export class AuthService {
  constructor(
    @Inject(AuthRepository)
    private readonly repository: AuthRepository,
  ) {}
  private attempts = new Map<
    string,
    {
      count: number;
      until: number;
    }
  >();
  private limit(req: AuthenticatedRequest) {
    const key = req.ip;
    const now = Date.now();
    for (const [k, v] of this.attempts)
      if (v.until < now) this.attempts.delete(k);
    const v = this.attempts.get(key) || { count: 0, until: now + 60000 };
    if (++v.count > 30) throw new HttpException("Thử lại sau một phút.", 429);
    this.attempts.set(key, v);
  }
  async session(u: any) {
    const sid = randomUUID();
    const persistent = u.role === "user";
    const refreshToken = persistent ? randomBytes(32).toString("hex") : null;
    await this.repository.insertSession([
      sid,
      u.id,
      persistent,
      refreshToken
        ? createHash("sha256").update(refreshToken).digest("hex")
        : null,
    ]);
    return {
      user: publicUser(u),
      ...(refreshToken ? { refreshToken } : {}),
      accessToken: jwt.sign({ sub: u.id, sid }, process.env.JWT_SECRET!, {
        expiresIn: persistent ? "15m" : "7d",
        algorithm: "HS256",
      }),
    };
  }
  async refresh(body: { refreshToken?: string }, req: AuthenticatedRequest) {
    this.limit(req);
    return this.repository.transaction(async (client) => {
      let result;
      if (
        typeof body.refreshToken === "string" &&
        /^[a-f0-9]{64}$/.test(body.refreshToken)
      ) {
        result = await client.query(
          "SELECT u.*,s.id AS session_id FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.refresh_token_hash=$1 AND s.expires_at>now() AND u.active=true AND u.role='user' FOR UPDATE OF s",
          [createHash("sha256").update(body.refreshToken).digest("hex")],
        );
      } else {
        // Upgrade existing mobile sessions once, while their signed token is still valid.
        try {
          const payload = jwt.verify(
            (req.headers.authorization || "").replace(/^Bearer /, ""),
            process.env.JWT_SECRET!,
            { algorithms: ["HS256"] },
          ) as jwt.JwtPayload;
          result = await client.query(
            "SELECT u.*,s.id AS session_id FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.id=$1 AND u.id=$2 AND s.refresh_token_hash IS NULL AND s.expires_at>now() AND u.active=true AND u.role='user' FOR UPDATE OF s",
            [payload.sid, payload.sub],
          );
        } catch {
          throw new UnauthorizedException("Vui lòng đăng nhập lại.");
        }
      }
      const user = result.rows[0];
      if (!user)
        throw new UnauthorizedException(
          "Phiên đã bị thu hồi. Vui lòng đăng nhập lại.",
        );
      let refreshToken = body.refreshToken;
      if (!refreshToken) {
        refreshToken = randomBytes(32).toString("hex");
        await client.query(
          "UPDATE sessions SET refresh_token_hash=$1,expires_at='infinity'::timestamptz WHERE id=$2",
          [
            createHash("sha256").update(refreshToken).digest("hex"),
            user.session_id,
          ],
        );
      }
      return {
        accessToken: jwt.sign(
          { sub: user.id, sid: user.session_id },
          process.env.JWT_SECRET!,
          { algorithm: "HS256", expiresIn: "15m" },
        ),
        refreshToken,
      };
    });
  }
  async register(body: AuthInput, req: AuthenticatedRequest) {
    this.limit(req);
    const c = contact(body);
    if (!c.email) fail("Cần email để đăng nhập và khôi phục tài khoản.");
    const name = text(body.name, "Họ tên", 100);
    const digest = await hash(password(body.password), 12);
    const r = await this.repository.insertUser([
      name,
      c.email,
      c.phone,
      digest,
    ]);
    return this.session(r.rows[0]);
  }
  async login(
    body: AuthInput,
    req: AuthenticatedRequest,
    expectedRole: "user" | "admin" = "user",
  ) {
    this.limit(req);
    const identifier = text(
      body.identifier || body.email,
      "Email hoặc SĐT",
      254,
    ).toLowerCase();
    const r = await this.repository.findByIdentifier([identifier]);
    const u = r.rows[0];
    if (
      !u ||
      !u.active ||
      u.role !== expectedRole ||
      typeof body.password !== "string" ||
      !(await compare(body.password, u.password_hash))
    )
      throw new UnauthorizedException(
        "Thông tin đăng nhập không đúng hoặc tài khoản bị khóa.",
      );
    return this.session(u);
  }
  async logout(req: AuthenticatedRequest) {
    await this.repository.deleteSession([req.sessionId]);
    return { ok: true };
  }
  me(req: AuthenticatedRequest) {
    return req.user;
  }
  async profile(req: AuthenticatedRequest, body: AuthInput) {
    const c = contact(body);
    if (!c.email) fail("Cần email để khôi phục tài khoản.");
    const avatar = body.avatar ? imageData(body.avatar) : "";
    const r = await this.repository.updateProfile([
      text(body.name, "Họ tên", 100),
      c.email,
      c.phone,
      avatar,
      req.user.id,
    ]);
    return publicUser(r.rows[0]);
  }
  async changePassword(req: AuthenticatedRequest, body: AuthInput) {
    const u = (await this.repository.findUser([req.user.id])).rows[0];
    if (!(await compare(String(body.current || ""), u.password_hash)))
      fail("Mật khẩu hiện tại không đúng.");
    await this.repository.updatePassword([
      await hash(password(body.password), 12),
      u.id,
    ]);
    await this.repository.revokeOtherSessions([u.id, req.sessionId]);
    return { ok: true };
  }
}
