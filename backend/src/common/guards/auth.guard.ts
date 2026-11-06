import {
  CanActivate,
  ForbiddenException,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import jwt from "jsonwebtoken";
import { Reflector } from "@nestjs/core";
import { AuthRepository } from "../../modules/auth/auth.repository";
import { publicUser } from "../validation/input";
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(AuthRepository)
    private readonly repository: AuthRepository,
    @Inject(Reflector) private readonly reflector: Reflector,
  ) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const path = req.path.toLowerCase().replace(/\/+$/, "");
    if (
      [
        "/auth/login",
        "/admin/auth/login",
        "/auth/register",
        "/auth/forgot-password",
        "/auth/reset-password",
        "/health",
      ].includes(path)
    )
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
    } catch {
      throw new UnauthorizedException(
        "Phiên đã hết hạn hoặc tài khoản bị khóa. Vui lòng đăng nhập lại.",
      );
    }
    if (
      this.reflector.getAllAndOverride<boolean>("adminOnly", [
        context.getHandler(),
        context.getClass(),
      ]) &&
      req.user.role !== "admin"
    )
      throw new ForbiddenException("Chỉ admin được truy cập trang quản trị.");
    if (
      req.user.role === "admin" &&
      !path.startsWith("/admin/") &&
      !path.startsWith("/auth/") &&
      !path.startsWith("/catalog/")
    )
      throw new ForbiddenException(
        "Tài khoản admin dùng chức năng quản trị trên web.",
      );
    return true;
  }
}
