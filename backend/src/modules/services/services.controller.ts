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
import type { ServicesInput } from "./dto/input.dto";
import { ServicesService } from "./services.service";
@Controller("")
export class ServicesController {
  constructor(
    @Inject(ServicesService)
    private readonly service: ServicesService,
  ) {}
  @Get("services")
  async services(
    @Req()
    r: AuthenticatedRequest,
  ) {
    return this.service.services(r);
  }
  @Post("services")
  async createService(
    @Req()
    r: AuthenticatedRequest,
    @Body()
    b: ServicesInput,
  ) {
    return this.service.createService(r, b);
  }
  @Patch("services/:id")
  async updateService(
    @Req()
    r: AuthenticatedRequest,
    @Param("id")
    id: string,
    @Body()
    b: ServicesInput,
  ) {
    return this.service.updateService(r, id, b);
  }
}
