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
} from "@nestjs/common";
import type { AuthenticatedRequest } from "../../common/types/authenticated-request";
import { integer } from "../../common/validation/input";
import { CategoriesService } from "./catalog.service";
@Controller("categories")
export class CategoriesController {
  constructor(
    @Inject(CategoriesService) private readonly service: CategoriesService,
  ) {}
  @Get() list(@Req() r: AuthenticatedRequest) {
    return this.service.list(r.user.id);
  }
  @Post() create(@Req() r: AuthenticatedRequest, @Body() b: any) {
    return this.service.save(r.user.id, null, b);
  }
  @Patch(":id") update(
    @Req() r: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() b: any,
  ) {
    return this.service.save(r.user.id, integer(id, "ID", 1), b);
  }
  @Delete(":id") remove(
    @Req() r: AuthenticatedRequest,
    @Param("id") id: string,
  ) {
    return this.service.remove(r.user.id, integer(id, "ID", 1));
  }
}
