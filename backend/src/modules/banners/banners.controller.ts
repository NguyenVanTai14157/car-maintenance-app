import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Req,
  SetMetadata,
} from "@nestjs/common";
import type { AuthenticatedRequest } from "../../common/types/authenticated-request";
import { integer } from "../../common/validation/input";
import { BannersService } from "./banners.service";

@Controller("banners")
export class PublicBannersController {
  constructor(@Inject(BannersService) private readonly banners: BannersService) {}
  @Get() list() {
    return this.banners.listActive();
  }
}

@Controller("admin/banners")
@SetMetadata("adminOnly", true)
export class AdminBannersController {
  constructor(@Inject(BannersService) private readonly banners: BannersService) {}
  @Get() list() {
    return this.banners.listAdmin();
  }
  @Post() create(@Req() r: AuthenticatedRequest, @Body() b: any) {
    return this.banners.create(r.user, b);
  }
  @Patch(":id") update(
    @Req() r: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() b: any,
  ) {
    return this.banners.update(r.user, integer(id, "ID", 1), b);
  }
  @Delete(":id") remove(
    @Req() r: AuthenticatedRequest,
    @Param("id") id: string,
  ) {
    return this.banners.remove(r.user, integer(id, "ID", 1));
  }
}
