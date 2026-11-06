import { Inject, Injectable } from "@nestjs/common";
import { PersonalRepository } from "./personal.repository";
import { planStatus } from "./personal.rules";
@Injectable()
export class DashboardService {
  constructor(
    @Inject(PersonalRepository) private readonly repo: PersonalRepository,
  ) {}
  async get(uid: number) {
    const vehicles = await this.repo.vehicles(uid),
      plans = (await this.repo.plans(uid)).map((p) => ({
        ...p,
        ...planStatus(p),
      })),
      records = await this.repo.records(uid);
    const active = plans.filter(
      (p) =>
        !p.vehicle_archived && !["completed", "cancelled"].includes(p.status),
    );
    return {
      vehicles: vehicles.filter((v) => !v.archived).length,
      upcoming: active.filter(
        (p) => p.status === "planned" || p.status === "soon",
      ),
      due: active.filter((p) => p.status === "due"),
      overdue: active.filter((p) => p.status === "overdue"),
      total_cost: records.reduce((sum, r) => sum + r.cost, 0),
      recent: records.slice(0, 5),
    };
  }
  async costs(uid: number) {
    const records = await this.repo.records(uid);
    const group = (key: (r: any) => string) =>
      Object.entries(
        records.reduce(
          (out, r) => {
            const k = key(r);
            out[k] = (out[k] || 0) + r.cost;
            return out;
          },
          {} as Record<string, number>,
        ),
      )
        .map(([period, cost]) => ({ period, cost }))
        .sort((a, b) => b.period.localeCompare(a.period));
    return {
      total: records.reduce((sum, r) => sum + r.cost, 0),
      monthly: group((r) => r.performed_date.slice(0, 7)),
      yearly: group((r) => r.performed_date.slice(0, 4)),
      records,
    };
  }
}
