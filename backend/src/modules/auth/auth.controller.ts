import {
  Body,
  Controller,
  Get,
  Inject,
  Patch,
  Post,
  Req,
} from "@nestjs/common";
import type { AuthenticatedRequest } from "../../common/types/authenticated-request";
import { AuthService } from "./auth.service";
import type { AuthInput } from "./dto/input.dto";
@Controller("auth")
export class AuthController {
  constructor(
    @Inject(AuthService)
    private readonly service: AuthService,
  ) {}
  @Post("register")
  async register(
    @Body()
    body: AuthInput,
    @Req()
    req: AuthenticatedRequest,
  ) {
    return this.service.register(body, req);
  }
  @Post("login")
  async login(
    @Body()
    body: AuthInput,
    @Req()
    req: AuthenticatedRequest,
  ) {
    return this.service.login(body, req);
  }
  @Post("logout")
  async logout(
    @Req()
    req: AuthenticatedRequest,
  ) {
    return this.service.logout(req);
  }
  @Get("me")
  me(
    @Req()
    req: AuthenticatedRequest,
  ) {
    return this.service.me(req);
  }
  @Patch("me")
  async profile(
    @Req()
    req: AuthenticatedRequest,
    @Body()
    body: AuthInput,
  ) {
    return this.service.profile(req, body);
  }
  @Post("password")
  async changePassword(
    @Req()
    req: AuthenticatedRequest,
    @Body()
    body: AuthInput,
  ) {
    return this.service.changePassword(req, body);
  }
}
