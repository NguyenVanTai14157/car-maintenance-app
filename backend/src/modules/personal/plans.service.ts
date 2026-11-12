import { Inject, Injectable } from "@nestjs/common";
import { fail } from "../../common/validation/input";
import { PersonalRepository } from "./personal.repository";
import { planInput, planStatus, nextSuggestion } from "./personal.rules";
@Injectable()
export class PlansService {
  constructor(
    @Inject(PersonalRepository) private readonly repo: PersonalRepository,
  ) {}
  async list(uid: number, c?: any) {
    return (await this.repo.plans(uid, c)).map((p) => ({
      ...p,
      ...planStatus(p),
    }));
  }
  async get(uid: number, id: number) {
    await this.repo.owned("plans", id, uid);
    return (await this.list(uid)).find((p) => p.id === id);
  }
  save(uid: number, id: number | null, b: any) {
    const data = planInput(b);
    return this.repo.transaction(uid, async (c) => {
      const old = id ? await this.repo.owned("plans", id, uid, c, true) : null;
      if (
        old &&
        (old.cancelled || (await this.repo.recordForPlan(uid, id!, c)))
      )
        fail("Chỉ có thể sửa lịch bảo dưỡng chưa hoàn thành và chưa hủy.");
      const vehicle = await this.repo.owned(
          "vehicles",
          data.vehicle_id,
          uid,
          c,
          true,
        ),
        category = await this.repo.owned(
          "categories",
          data.category_id,
          uid,
          c,
        );
      if (vehicle.archived)
        fail("Xe đã lưu trữ. Hãy khôi phục xe trước khi tạo/sửa lịch.");
      if (!category.active && (!old || old.category_id !== data.category_id))
        fail("Hạng mục đã ngừng sử dụng.");
      return this.repo.save("plans", uid, id, data, c);
    });
  }
  cancel(uid: number, id: number) {
    return this.repo.transaction(uid, async (c) => {
      const p = await this.repo.owned("plans", id, uid, c, true);
      if (p.cancelled || (await this.repo.recordForPlan(uid, id, c)))
        fail("Lịch đã hủy hoặc đã hoàn thành.");
      return this.repo.save("plans", uid, id, { cancelled: true }, c);
    });
  }
  fromRecord(uid: number, id: number) {
    return this.repo.transaction(uid, async (c) => {
      const r = await this.repo.owned("records", id, uid, c);
      if (await this.repo.nextForRecord(uid, id, c))
        fail("Lần bảo dưỡng này đã có lịch tiếp theo.");
      const v = await this.repo.owned("vehicles", r.vehicle_id, uid, c);
      if (v.archived) fail("Xe đã lưu trữ.");
      const cat = await this.repo.owned("categories", r.category_id, uid, c);
      if (!cat.active) fail("Hạng mục đã ngừng sử dụng.");
      const next = nextSuggestion(r);
      if (!next.due_date && next.due_km == null)
        fail(
          "Hãy nhập chu kỳ theo tháng hoặc số km cho lần bảo dưỡng này để tạo lịch tiếp theo.",
        );
      const settings = await this.repo.settings(uid, c);
      return this.repo.save(
        "plans",
        uid,
        null,
        {
          vehicle_id: r.vehicle_id,
          category_id: r.category_id,
          ...next,
          remind_days: settings.remind_days,
          remind_km: settings.remind_km,
          interval_months: r.interval_months,
          interval_km: r.interval_km,
          source_record_id: id,
        },
        c,
      );
    });
  }
}
