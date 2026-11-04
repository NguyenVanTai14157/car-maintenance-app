import { Controller, Get, Inject, Req } from "@nestjs/common";
import type { AuthenticatedRequest } from "../../common/types/authenticated-request";
import { ReportsService } from "./reports.service";
@Controller("")
export class ReportsController {
  constructor(
    @Inject(ReportsService)
    private readonly service: ReportsService,
  ) {}
  @Get("reports")
  async reports(
    @Req()
    r: AuthenticatedRequest,
  ) {
    return this.service.reports(r);
  }
}
