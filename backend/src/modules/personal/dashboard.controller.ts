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
import { DashboardService } from "./dashboard.service";
import { InboxService } from "./inbox.service";
@Controller()
export class DashboardController {
  constructor(
    @Inject(DashboardService) private readonly service: DashboardService,
    @Inject(InboxService) private readonly inbox: InboxService,
  ) {}
  @Get("dashboard") async dashboard(@Req() r: AuthenticatedRequest) {
    await this.inbox.scan(r.user.id);
    return this.service.get(r.user.id);
  }
  @Get("costs") costs(@Req() r: AuthenticatedRequest) {
    return this.service.costs(r.user.id);
  }
  @Get("notifications") notifications(@Req() r: AuthenticatedRequest) {
    return this.inbox.list(r.user.id);
  }
  @Post("notifications/read") read(@Req() r: AuthenticatedRequest) {
    return this.inbox.read(r.user.id);
  }
}
