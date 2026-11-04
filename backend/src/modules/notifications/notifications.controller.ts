import { Controller, Get, Inject, Post, Req } from "@nestjs/common";
import type { AuthenticatedRequest } from "../../common/types/authenticated-request";
import { NotificationsService } from "./notifications.service";
@Controller("")
export class NotificationsController {
  constructor(
    @Inject(NotificationsService)
    private readonly service: NotificationsService,
  ) {}
  @Get("notifications")
  async notifications(
    @Req()
    r: AuthenticatedRequest,
  ) {
    return this.service.notifications(r);
  }
  @Post("notifications/read")
  async read(
    @Req()
    r: AuthenticatedRequest,
  ) {
    return this.service.read(r);
  }
}
