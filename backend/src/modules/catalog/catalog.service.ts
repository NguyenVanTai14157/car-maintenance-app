import { Inject, Injectable, ForbiddenException } from "@nestjs/common";
import { CatalogRepository, CatalogKind } from "./catalog.repository";
import { text, integer, fail, allow } from "../../common/validation/input";
import { bool } from "../personal/personal.rules";
import { onlyFields } from "../admin/admin.rules";
import type { CatalogInput } from "../admin/dto/input.dto";
@Injectable()
export class CatalogService {
  constructor(
    @Inject(CatalogRepository) private readonly repo: CatalogRepository,
  ) {}
  list(kind: CatalogKind, q: any, publicOnly = false) {
    return this.repo.list(kind, q, publicOnly);
  }
  private async checkAdmin(c: any, id: number) {
    if (
      !(
        await c.query(
          "SELECT id FROM users WHERE id=$1 AND role='admin' AND active=true FOR SHARE",
          [id],
        )
      ).rowCount
    )
      throw new ForbiddenException("Quyền quản trị đã thay đổi.");
  }
  save(actor: any, kind: CatalogKind, id: number | null, b: CatalogInput) {
    allow(actor, ["admin"]);
    onlyFields(
      b,
      kind === "models"
        ? ["name", "active", "brand_id", "type_id"]
        : ["name", "active"],
    );
    return this.repo.transaction(async (c) => {
      await this.checkAdmin(c, actor.id);
      const old = id ? await this.repo.get(kind, id, c, true) : null,
        data: any = {};
      if (!old || b.name !== undefined)
        data.name = text(b.name, "Tên danh mục", 100);
      if (!old || b.active !== undefined)
        data.active =
          b.active === undefined ? true : bool(b.active, "Trạng thái");
      if (kind === "models") {
        if (!old || b.brand_id !== undefined)
          data.brand_id = integer(b.brand_id, "Hãng xe", 1);
        if (!old || b.type_id !== undefined)
          data.type_id =
            b.type_id == null ? null : integer(b.type_id, "Loại xe", 1);
        const next = { ...old, ...data };
        if (
          old &&
          (old.brand_id !== next.brand_id || old.type_id !== next.type_id) &&
          (await this.repo.used(kind, id!, c))
        )
          fail("Dòng xe đã được sử dụng; không được đổi hãng hoặc loại xe.");
        const brand = await this.repo.get("brands", next.brand_id, c, true);
        if (next.active && !brand.active) fail("Hãng xe đã ngừng sử dụng.");
        if (next.type_id) {
          const type = await this.repo.get("types", next.type_id, c, true);
          if (next.active && !type.active) fail("Loại xe đã ngừng sử dụng.");
        }
      }
      const row = await this.repo.save(kind, id, data, c);
      await this.repo.audit(
        c,
        actor.id,
        kind,
        row.id,
        id ? "update" : "create",
      );
      return row;
    });
  }
  remove(actor: any, kind: CatalogKind, id: number) {
    allow(actor, ["admin"]);
    return this.repo.transaction(async (c) => {
      await this.checkAdmin(c, actor.id);
      await this.repo.get(kind, id, c, true);
      if (await this.repo.used(kind, id, c))
        fail(
          "Danh mục đã được sử dụng. Hãy ngừng sử dụng để giữ dữ liệu liên quan.",
        );
      await this.repo.remove(kind, id, c);
      await this.repo.audit(c, actor.id, kind, id, "delete");
      return { ok: true };
    });
  }
  async vehicleReferences(b: any, old: any, c: any) {
    const id = (key: string) =>
      b[key] === undefined
        ? null
        : b[key] == null || b[key] === ""
          ? null
          : integer(b[key], key, 1);
    const brand_id = id("brand_id"),
      model_id = id("model_id");
    let type_id = id("type_id");
    if (model_id && !brand_id) fail("Chọn hãng xe tương ứng với dòng xe.");
    let brand = b.brand,
      model = b.model;
    if (brand_id) {
      const x = await this.repo.get("brands", brand_id, c, true);
      if (b.brand && b.brand !== x.name && b.brand !== old?.brand)
        fail("Tên hãng không khớp danh mục đã chọn.");
      if (!x.active && old?.brand_id !== brand_id)
        fail("Hãng xe đã ngừng sử dụng.");
      brand = x.name;
    }
    if (model_id) {
      const x = await this.repo.get("models", model_id, c, true);
      if (b.model && b.model !== x.name && b.model !== old?.model)
        fail("Tên dòng xe không khớp danh mục đã chọn.");
      if (x.brand_id !== brand_id) fail("Dòng xe không thuộc hãng đã chọn.");
      if (!x.active && old?.model_id !== model_id)
        fail("Dòng xe đã ngừng sử dụng.");
      model = x.name;
      if (type_id === null && b.type_id === undefined) type_id = x.type_id;
      if (x.type_id && type_id !== x.type_id)
        fail("Loại xe không khớp dòng xe đã chọn.");
    }
    if (type_id) {
      const x = await this.repo.get("types", type_id, c, true);
      if (!x.active && old?.type_id !== type_id)
        fail("Loại xe đã ngừng sử dụng.");
    }
    return { ...b, brand, model, brand_id, model_id, type_id };
  }
}
