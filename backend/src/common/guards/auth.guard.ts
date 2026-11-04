import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import jwt from "jsonwebtoken";
import { AuthRepository } from "../../modules/auth/auth.repository";
import { publicUser } from "../validation/input";
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(AuthRepository)
    private readonly repository: AuthRepository,
  ) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    if (["/auth/login", "/auth/register", "/health"].includes(req.path))
      return true;
    try {
      const payload = jwt.verify(
        (req.headers.authorization || "").replace(/^Bearer /, ""),
        process.env.JWT_SECRET!,
        { algorithms: ["HS256"] },
      ) as any;
      const result = await this.repository.findSessionUser([
        payload.sub,
        payload.sid,
      ]);
      if (!result.rows[0]) throw new Error();
      req.user = publicUser(result.rows[0]);
      req.sessionId = payload.sid;
      return true;
    } catch {
      throw new UnauthorizedException(
        "Phiên đã hết hạn hoặc tài khoản bị khóa. Vui lòng đăng nhập lại.",
      );
    }
  }
}
