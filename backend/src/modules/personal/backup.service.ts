import { Inject, Injectable } from "@nestjs/common";
import { PersonalRepository } from "./personal.repository";
import { vehicleInput, recordInput, planInput, bool } from "./personal.rules";
import { fail, text, integer } from "../../common/validation/input";
import { CatalogService } from "../catalog/catalog.service";
@Injectable()
export class BackupService {
  constructor(
    @Inject(PersonalRepository) private readonly repo: PersonalRepository,
    @Inject(CatalogService) private readonly catalog: CatalogService,
  ) {}
  export(uid: number) {
    return this.repo.transaction(uid, async (c) => ({
      kind: "autocare-personal",
      version: 1,
      exported_at: new Date().toISOString(),
      vehicles: await this.repo.vehicles(uid, c),
      categories: await this.repo.categories(uid, c),
      plans: await this.repo.plans(uid, c),
      records: await this.repo.records(uid, c),
      settings: await this.repo.settings(uid, c),
    }));
  }
  restore(uid: number, b: any) {
    if (b?.kind !== "autocare-personal" || b.version !== 1)
      fail("File không phải bản sao lưu AutoCare tương thích.");
    if (JSON.stringify(b).length > 28000000) fail("File sao lưu quá lớn.");
    for (const k of ["vehicles", "categories", "plans", "records"])
      if (
        !Array.isArray(b[k]) ||
        b[k].length > 10000 ||
        b[k].some(
          (x: any) =>
            !x ||
            typeof x !== "object" ||
            !Number.isSafeInteger(x.id) ||
            x.id < 1,
        )
      )
        fail("Dữ liệu sao lưu không hợp lệ.");
    const unique = (list: any[]) => {
      const ids = list.map((x) => integer(x.id, "ID bản sao lưu", 1));
      if (new Set(ids).size !== ids.length) fail("Bản sao lưu có ID trùng.");
      return new Set(ids);
    };
    const vs = unique(b.vehicles),
      cs = unique(b.categories),
      ps = unique(b.plans),
      rs = unique(b.records);
    const categories = b.categories.map((x: any) => ({
      old: x.id,
      name: text(x.name, "Hạng mục", 100),
      active: bool(x.active, "Trạng thái hạng mục"),
    }));
    if (
      new Set(categories.map((x: any) => x.name.toLowerCase())).size !==
      categories.length
    )
      fail("Hạng mục trùng tên.");
    const vehicles = b.vehicles.map((x: any) => ({
      old: x.id,
      ...vehicleInput(x),
      archived: bool(x.archived, "Trạng thái xe"),
    }));
    const plates = vehicles.map((x: any) => x.plate).filter(Boolean);
    if (new Set(plates).size !== plates.length) fail("Biển số trùng.");
    const plans = b.plans.map((x: any) => {
      const v = planInput(x);
      if (
        !vs.has(v.vehicle_id) ||
        !cs.has(v.category_id) ||
        (x.source_record_id && !rs.has(x.source_record_id))
      )
        fail("Liên kết kế hoạch không hợp lệ.");
      return {
        old: x.id,
        ...v,
        cancelled: bool(x.cancelled, "Trạng thái lịch"),
        source: x.source_record_id || null,
      };
    });
    const records = b.records.map((x: any) => {
      const v = recordInput(x);
      if (
        !vs.has(v.vehicle_id) ||
        !cs.has(v.category_id) ||
        (x.plan_id && !ps.has(x.plan_id))
      )
        fail("Liên kết lịch sử không hợp lệ.");
      const vehicle = vehicles.find((y: any) => y.old === v.vehicle_id);
      if (v.odometer > vehicle.odometer)
        fail("Km lịch sử vượt km hiện tại của xe trong bản sao lưu.");
      if (x.plan_id) {
        const p = plans.find((y: any) => y.old === x.plan_id);
        if (
          p.cancelled ||
          p.vehicle_id !== v.vehicle_id ||
          p.category_id !== v.category_id
        )
          fail("Lịch sử không khớp kế hoạch.");
      }
      return { old: x.id, ...v, plan: x.plan_id || null };
    });
    const linked = records.filter((x: any) => x.plan).map((x: any) => x.plan);
    if (new Set(linked).size !== linked.length)
      fail("Một lịch có nhiều bản ghi hoàn thành.");
    const sources = plans
      .filter((x: any) => x.source)
      .map((x: any) => x.source);
    if (new Set(sources).size !== sources.length)
      fail("Một bản ghi có nhiều lịch đề xuất.");
    for (const p of plans)
      if (p.source) {
        const r = records.find((x: any) => x.old === p.source);
        if (
          r.vehicle_id !== p.vehicle_id ||
          r.category_id !== p.category_id ||
          r.plan === p.old
        )
          fail("Lịch tiếp theo không khớp bản ghi nguồn.");
      }
    const ordered = [...records].sort(
      (a: any, b: any) =>
        a.vehicle_id - b.vehicle_id ||
        a.performed_date.localeCompare(b.performed_date),
    );
    let vehicle = 0,
      date = "",
      priorMax = -1,
      dayMax = -1;
    for (const r of ordered) {
      if (r.vehicle_id !== vehicle) {
        vehicle = r.vehicle_id;
        date = "";
        priorMax = -1;
        dayMax = -1;
      }
      if (r.performed_date !== date) {
        priorMax = Math.max(priorMax, dayMax);
        dayMax = -1;
        date = r.performed_date;
      }
      if (r.odometer < priorMax) fail("Km lịch sử không đúng thứ tự.");
      dayMax = Math.max(dayMax, r.odometer);
    }
    const settings = {
      notifications: bool(b.settings?.notifications, "Thông báo"),
      remind_days: integer(b.settings.remind_days, "Nhắc ngày", 0, 365),
      remind_km: integer(b.settings.remind_km, "Nhắc km", 0, 100000),
      remind_hour: integer(b.settings.remind_hour, "Giờ nhắc", 0, 23),
    };
    return this.repo.transaction(uid, async (c) => {
      const preparedVehicles = [];
      for (const v of vehicles) {
        const source = b.vehicles.find((x: any) => x.id === v.old);
        const linked = await this.catalog.vehicleReferences(
          {
            ...v,
            brand_id: source.brand_id,
            model_id: source.model_id,
            type_id: source.type_id,
          },
          source,
          c,
        );
        preparedVehicles.push({
          ...v,
          brand_id: linked.brand_id,
          model_id: linked.model_id,
          type_id: linked.type_id,
        });
      }
      await this.repo.clear(uid, c);
      const vm = new Map(),
        cm = new Map(),
        pm = new Map(),
        rm = new Map();
      for (const { old, ...v } of categories)
        cm.set(old, (await this.repo.save("categories", uid, null, v, c)).id);
      for (const { old, ...v } of preparedVehicles)
        vm.set(old, (await this.repo.save("vehicles", uid, null, v, c)).id);
      for (const { old, source, ...v } of plans)
        pm.set(
          old,
          (
            await this.repo.save(
              "plans",
              uid,
              null,
              {
                ...v,
                vehicle_id: vm.get(v.vehicle_id),
                category_id: cm.get(v.category_id),
              },
              c,
            )
          ).id,
        );
      for (const { old, plan, ...v } of records)
        rm.set(
          old,
          (
            await this.repo.save(
              "records",
              uid,
              null,
              {
                ...v,
                vehicle_id: vm.get(v.vehicle_id),
                category_id: cm.get(v.category_id),
                plan_id: plan ? pm.get(plan) : null,
              },
              c,
            )
          ).id,
        );
      for (const v of plans)
        if (v.source)
          await this.repo.save(
            "plans",
            uid,
            pm.get(v.old),
            { source_record_id: rm.get(v.source) },
            c,
          );
      await this.repo.updateSettings(uid, settings, c);
      return { ok: true, vehicles: vm.size, plans: pm.size, records: rm.size };
    });
  }
}
