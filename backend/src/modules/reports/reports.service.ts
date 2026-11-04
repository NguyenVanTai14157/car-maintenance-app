import type { AuthenticatedRequest } from "../../common/types/authenticated-request";
import { allow } from "../../common/validation/input";
import { Inject, Injectable } from "@nestjs/common";
import { ReportsRepository } from "./reports.repository";
@Injectable()
export class ReportsService {
  constructor(
    @Inject(ReportsRepository)
    private readonly repository: ReportsRepository,
  ) {}
  async reports(r: AuthenticatedRequest) {
    allow(r.user, ["admin", "receptionist"]);
    const daily = (await this.repository.dailyRevenue([])).rows;
    const monthly = (await this.repository.monthlyRevenue([])).rows;
    const yearly = (await this.repository.yearlyRevenue([])).rows;
    const popular = (await this.repository.popularServices([])).rows;
    return {
      daily,
      monthly,
      yearly,
      popular,
      summary: (await this.repository.summary([])).rows[0],
    };
  }
}
