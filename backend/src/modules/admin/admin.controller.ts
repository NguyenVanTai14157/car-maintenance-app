import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  SetMetadata,
} from "@nestjs/common";
import { AdminRepository } from "./admin.repository";
import { AdminUsersService } from "./admin-users.service";
import { CatalogService } from "../catalog/catalog.service";
import { catalogKind } from "../catalog/catalog.controller";
import { AuthService } from "../auth/auth.service";
import { integer } from "../../common/validation/input";
import type { AuthenticatedRequest } from "../../common/types/authenticated-request";
import type { AuthInput } from "../auth/dto/input.dto";
import type {
  PageQuery,
  UserCreateInput,
  UserUpdateInput,
  CatalogInput,
} from "./dto/input.dto";
@Controller("admin")
@SetMetadata("adminOnly", true)
export class AdminController {
  constructor(
    @Inject(AdminRepository) private readonly repo: AdminRepository,
    @Inject(AdminUsersService) private readonly users: AdminUsersService,
    @Inject(CatalogService) private readonly catalog: CatalogService,
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}
  @Post("auth/login") login(
    @Body() b: AuthInput,
    @Req() r: AuthenticatedRequest,
  ) {
    return this.auth.login(b, r, "admin");
  }
  @Get("dashboard") dashboard() {
    return this.repo.dashboard();
  }
  @Get("users") list(@Query() q: PageQuery) {
    return this.repo.users(q);
  }
  @Get("users/:id") detail(@Param("id") id: string) {
    return this.repo.detail(integer(id, "ID", 1));
  }
  @Post("users") create(
    @Req() r: AuthenticatedRequest,
    @Body() b: UserCreateInput,
  ) {
    return this.users.create(r.user, b);
  }
  @Patch("users/:id") update(
    @Req() r: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() b: UserUpdateInput,
  ) {
    return this.users.update(r.user, integer(id, "ID", 1), b);
  }
  @Delete("users/:id") remove(
    @Req() r: AuthenticatedRequest,
    @Param("id") id: string,
  ) {
    return this.users.remove(r.user, integer(id, "ID", 1));
  }
  @Get("vehicles") vehicles(@Query() q: PageQuery) {
    return this.repo.vehicles(q);
  }
  @Get("vehicles/:id") vehicle(@Param("id") id: string) {
    return this.repo.vehicle(integer(id, "ID", 1));
  }
  @Get("vehicles/:id/records") records(
    @Param("id") id: string,
    @Query() q: PageQuery,
  ) {
    return this.repo.history(integer(id, "ID", 1), q);
  }
  @Get("audit-logs") logs(@Query() q: PageQuery) {
    return this.repo.logs(q);
  }
  @Get("catalog/:kind") catalogList(
    @Param("kind") kind: string,
    @Query() q: PageQuery,
  ) {
    return this.catalog.list(catalogKind(kind), q);
  }
  @Post("catalog/:kind") catalogCreate(
    @Req() r: AuthenticatedRequest,
    @Param("kind") kind: string,
    @Body() b: CatalogInput,
  ) {
    return this.catalog.save(r.user, catalogKind(kind), null, b);
  }
  @Patch("catalog/:kind/:id") catalogUpdate(
    @Req() r: AuthenticatedRequest,
    @Param("kind") kind: string,
    @Param("id") id: string,
    @Body() b: CatalogInput,
  ) {
    return this.catalog.save(
      r.user,
      catalogKind(kind),
      integer(id, "ID", 1),
      b,
    );
  }
  @Delete("catalog/:kind/:id") catalogRemove(
    @Req() r: AuthenticatedRequest,
    @Param("kind") kind: string,
    @Param("id") id: string,
  ) {
    return this.catalog.remove(r.user, catalogKind(kind), integer(id, "ID", 1));
  }
}
