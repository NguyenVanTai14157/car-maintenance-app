import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Req,
} from "@nestjs/common";
import type { AuthenticatedRequest } from "../../common/types/authenticated-request";
import type { UsersInput } from "./dto/input.dto";
import { UsersService } from "./users.service";
@Controller("")
export class UsersController {
  constructor(
    @Inject(UsersService)
    private readonly service: UsersService,
  ) {}
  @Get("staff")
  async staff(
    @Req()
    r: AuthenticatedRequest,
  ) {
    return this.service.staff(r);
  }
  @Get("users")
  async users(
    @Req()
    r: AuthenticatedRequest,
  ) {
    return this.service.users(r);
  }
  @Post("users")
  async createUser(
    @Req()
    r: AuthenticatedRequest,
    @Body()
    b: UsersInput,
  ) {
    return this.service.createUser(r, b);
  }
  @Patch("users/:id")
  async user(
    @Req()
    r: AuthenticatedRequest,
    @Param("id")
    raw: string,
    @Body()
    b: UsersInput,
  ) {
    return this.service.user(r, raw, b);
  }
}
