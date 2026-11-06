import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";
import { pageInput, queryBool, searchPattern } from "../admin/admin.rules";
import { integer } from "../../common/validation/input";
import type { PageQuery } from "../admin/dto/input.dto";
export type CatalogKind = "brands" | "models" | "types";
const tables = {
  brands: "vehicle_brands",
  models: "vehicle_models",
  types: "vehicle_types",
};
@Injectable()
export class CatalogRepository {
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}
  transaction<T>(fn: (c: any) => Promise<T>) {
    return this.db.transaction(async (c) => {
      await c.query("SELECT pg_advisory_xact_lock(9098,0)");
      await c.query("SELECT pg_advisory_xact_lock(9097,0)");
      return fn(c);
    });
  }
  async get(kind: CatalogKind, id: number, c: any = this.db, lock = false) {
    const r = await c.query(
      `SELECT * FROM ${tables[kind]} WHERE id=$1${lock ? " FOR UPDATE" : ""}`,
      [id],
    );
    if (!r.rows[0]) throw new NotFoundException("Không tìm thấy danh mục xe.");
    return r.rows[0];
  }
  async list(kind: CatalogKind, q: PageQuery, publicOnly = false) {
    const p = pageInput(q),
      v: any[] = [],
      w: string[] = [];
    if (p.q) {
      v.push(searchPattern(p.q));
      w.push(`x.name ILIKE $${v.length}`);
    }
    const active = publicOnly ? true : queryBool(q.active, "Trạng thái");
    if (active !== undefined) {
      v.push(active);
      w.push(`x.active=$${v.length}`);
    }
    if (kind === "models" && q.brand_id !== undefined) {
      v.push(integer(q.brand_id, "Hãng", 1));
      w.push(`x.brand_id=$${v.length}`);
    }
    if (kind === "models" && q.type_id !== undefined) {
      v.push(integer(q.type_id, "Loại xe", 1));
      w.push(`x.type_id=$${v.length}`);
    }
    if (publicOnly && kind === "models")
      w.push("b.active AND (x.type_id IS NULL OR t.active)");
    const joins =
      kind === "models"
        ? "JOIN vehicle_brands b ON b.id=x.brand_id LEFT JOIN vehicle_types t ON t.id=x.type_id"
        : "";
    const clause = w.length ? "WHERE " + w.join(" AND ") : "";
    const count = await this.db.query(
      `SELECT count(*)::int total FROM ${tables[kind]} x ${joins} ${clause}`,
      v,
    );
    const rows = await this.db.query(
      `SELECT x.*${kind === "models" ? ",b.name brand_name,t.name type_name,b.active brand_active,COALESCE(t.active,true) type_active" : ""} FROM ${tables[kind]} x ${joins} ${clause} ORDER BY lower(x.name),x.id LIMIT $${v.length + 1} OFFSET $${v.length + 2}`,
      [...v, p.page_size, p.offset],
    );
    return {
      items: rows.rows,
      total: count.rows[0].total,
      page: p.page,
      page_size: p.page_size,
    };
  }
  async save(kind: CatalogKind, id: number | null, data: any, c: any) {
    const keys = Object.keys(data);
    if (
      keys.some(
        (k) =>
          ![
            "name",
            "active",
            ...(kind === "models" ? ["brand_id", "type_id"] : []),
          ].includes(k),
      )
    )
      throw Error("Invalid catalog field");
    const values = keys.map((k) => data[k]);
    return (
      await c.query(
        id
          ? `UPDATE ${tables[kind]} SET ${keys.map((k, i) => `${k}=$${i + 1}`).join(",")} WHERE id=$${keys.length + 1} RETURNING *`
          : `INSERT INTO ${tables[kind]}(${keys.join(",")}) VALUES(${keys.map((_, i) => "$" + (i + 1)).join(",")}) RETURNING *`,
        id ? [...values, id] : values,
      )
    ).rows[0];
  }
  async used(kind: CatalogKind, id: number, c: any) {
    const col = { brands: "brand_id", models: "model_id", types: "type_id" }[
      kind
    ];
    const sql =
      `SELECT id FROM vehicles WHERE ${col}=$1` +
      (kind === "brands"
        ? " UNION ALL SELECT id FROM vehicle_models WHERE brand_id=$1"
        : kind === "types"
          ? " UNION ALL SELECT id FROM vehicle_models WHERE type_id=$1"
          : "");
    return (await c.query(sql + " LIMIT 1", [id])).rowCount > 0;
  }
  async remove(kind: CatalogKind, id: number, c: any) {
    await c.query(`DELETE FROM ${tables[kind]} WHERE id=$1`, [id]);
  }
  async audit(
    c: any,
    actor: number,
    kind: CatalogKind,
    id: number,
    action: string,
  ) {
    await c.query(
      "INSERT INTO admin_audit_logs(actor_id,action,entity,target_id) VALUES($1,$2,$3,$4)",
      [actor, "catalog." + action, tables[kind], id],
    );
  }
}
