import { Inject, Injectable } from "@nestjs/common";
import { fail, integer } from "../../common/validation/input";
import { PersonalRepository } from "./personal.repository";
import { recordInput, nextSuggestion } from "./personal.rules";
@Injectable()
export class RecordsService {
  constructor(
    @Inject(PersonalRepository) private readonly repo: PersonalRepository,
  ) {}
  async list(uid: number) {
    return (await this.repo.records(uid)).map((r) => ({
      ...r,
      suggestion: nextSuggestion(r),
    }));
  }
  async get(uid: number, id: number) {
    await this.repo.owned("records", id, uid);
    return (await this.list(uid)).find((r) => r.id === id);
  }
  save(uid: number, id: number | null, b: any) {
    return this.repo.transaction(uid, async (c) => {
      const old = id
        ? await this.repo.owned("records", id, uid, c, true)
        : null;
      if (old && b.plan_id != null && Number(b.plan_id) !== Number(old.plan_id))
        fail("Không thể đổi liên kết kế hoạch của bản ghi đã lưu.");
      const planId = old
        ? old.plan_id
        : b.plan_id
          ? integer(b.plan_id, "Lịch", 1)
          : null;
      let input = { ...b };
      if (planId) {
        const p = await this.repo.owned("plans", planId, uid, c, true);
        if (
          !old &&
          (p.cancelled || (await this.repo.recordForPlan(uid, planId, c)))
        )
          fail("Lịch đã hủy hoặc đã hoàn thành.");
        if (
          (b.vehicle_id && Number(b.vehicle_id) !== p.vehicle_id) ||
          (b.category_id && Number(b.category_id) !== p.category_id)
        )
          fail("Xe/hạng mục phải khớp kế hoạch.");
        input = {
          ...input,
          vehicle_id: p.vehicle_id,
          category_id: p.category_id,
          interval_months: b.interval_months ?? p.interval_months,
          interval_km: b.interval_km ?? p.interval_km,
        };
      }
      const data = recordInput(input),
        v = await this.repo.owned("vehicles", data.vehicle_id, uid, c, true),
        cat = await this.repo.owned("categories", data.category_id, uid, c);
      if (
        old &&
        (old.vehicle_id !== data.vehicle_id ||
          old.category_id !== data.category_id) &&
        (await this.repo.nextForRecord(uid, old.id, c))
      )
        fail("Bản ghi đã có lịch tiếp theo; không thể đổi xe hoặc hạng mục.");
      if ((!old || old.vehicle_id !== data.vehicle_id) && v.archived)
        fail("Không ghi thêm bảo dưỡng cho xe đã lưu trữ.");
      if ((!old || old.category_id !== data.category_id) && !cat.active)
        fail("Hạng mục đã ngừng sử dụng.");
      if (
        await this.repo.conflictKm(
          uid,
          data.vehicle_id,
          data.performed_date,
          data.odometer,
          id || 0,
          c,
        )
      )
        fail("Số km không khớp thứ tự lịch sử của xe. Kiểm tra ngày và số km.");
      const record = await this.repo.save(
        "records",
        uid,
        id,
        { ...data, plan_id: planId },
        c,
      );
      if (data.odometer > v.odometer)
        await this.repo.save(
          "vehicles",
          uid,
          v.id,
          { odometer: data.odometer },
          c,
        );
      return { ...record, suggestion: nextSuggestion(record) };
    });
  }
  remove(uid: number, id: number) {
    return this.repo.transaction(uid, async (c) => {
      await this.repo.owned("records", id, uid, c, true);
      await this.repo.remove("records", id, uid, c);
      return { ok: true };
    });
  }
}
