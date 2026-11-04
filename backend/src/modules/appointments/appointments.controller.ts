import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Req,
} from "@nestjs/common";
import type { AuthenticatedRequest } from "../../common/types/authenticated-request";
import { AppointmentsService } from "./appointments.service";
import type { AppointmentsInput } from "./dto/input.dto";
@Controller("appointments")
export class AppointmentsController {
  constructor(
    @Inject(AppointmentsService)
    private readonly service: AppointmentsService,
  ) {}
  @Get()
  async list(
    @Req()
    r: AuthenticatedRequest,
  ) {
    return this.service.list(r);
  }
  @Get(":id")
  async detail(
    @Req()
    r: AuthenticatedRequest,
    @Param("id")
    raw: string,
  ) {
    return this.service.detail(r, raw);
  }
  @Post()
  async create(
    @Req()
    r: AuthenticatedRequest,
    @Body()
    b: AppointmentsInput,
  ) {
    return this.service.create(r, b);
  }
  @Post(":id/action")
  async action(
    @Req()
    r: AuthenticatedRequest,
    @Param("id")
    raw: string,
    @Body()
    b: AppointmentsInput,
  ) {
    return this.service.action(r, raw, b);
  }
}
