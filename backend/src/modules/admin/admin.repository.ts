import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";
import { pageInput, queryBool, searchPattern } from "./admin.rules";
import { integer, fail } from "../../common/validation/input";
import type { PageQuery } from "./dto/input.dto";
export const userColumns =
  "u.id,u.name,u.email,u.phone,u.role,u.avatar,u.active,u.created_at";
@Injectable()
export class AdminRepository {
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}
  transaction<T>(uid: number | null, fn: (c: any) => Promise<T>) {
    return this.db.transaction(async (c) => {
      await c.query("SELECT pg_advisory_xact_lock(9098,0)");
      if (uid) await c.query("SELECT pg_advisory_xact_lock(9099,$1)", [uid]);
      return fn(c);
    });
  }
  async user(id: number, c: any = this.db, lock = false) {
    const r = await c.query(
      `SELECT ${userColumns} FROM users u WHERE u.id=$1${lock ? " FOR UPDATE" : ""}`,
      [id],
    );
    if (!r.rows[0]) throw new NotFoundException("Không tìm thấy người dùng.");
    return r.rows[0];
  }
  async audit(
    c: any,
    actor: number,
    action: string,
    entity: string,
    target: number,
    details: any = {},
  ) {
    await c.query(
      "INSERT INTO admin_audit_logs(actor_id,action,entity,target_id,details) VALUES($1,$2,$3,$4,$5::jsonb)",
      [actor, action, entity, target, JSON.stringify(details)],
    );
  }
  async users(q: PageQuery) {
    const p = pageInput(q),
      v: any[] = [],
      where: string[] = [];
    const add = (sql: string, value: any) => {
      v.push(value);
      where.push(sql.replace("?", `$${v.length}`));
    };
    if (p.q) {
      v.push(searchPattern(p.q));
      where.push(
        `(u.name ILIKE $${v.length} OR u.email ILIKE $${v.length} OR COALESCE(u.phone,'') ILIKE $${v.length})`,
      );
    }
    const active = queryBool(q.active, "Trạng thái");
    if (active !== undefined) add("u.active=?", active);
    if (q.role) {
      if (!["user", "admin"].includes(q.role)) fail("Vai trò không hợp lệ.");
      add("u.role=?", q.role);
    }
    const clause = where.length ? "WHERE " + where.join(" AND ") : "";
    const count = await this.db.query(
      `SELECT count(*)::int total FROM users u ${clause}`,
      v,
    );
    const rows = await this.db.query(
      `SELECT ${userColumns},(SELECT count(*)::int FROM vehicles v WHERE v.owner_id=u.id) vehicle_count FROM users u ${clause} ORDER BY u.id DESC LIMIT $${v.length + 1} OFFSET $${v.length + 2}`,
      [...v, p.page_size, p.offset],
    );
    return {
      items: rows.rows,
      total: count.rows[0].total,
      page: p.page,
      page_size: p.page_size,
    };
  }
  async detail(id: number) {
    const user = await this.user(id);
    const counts = await this.db.query(
      "SELECT (SELECT count(*)::int FROM vehicles WHERE owner_id=$1) vehicles,(SELECT count(*)::int FROM plans WHERE owner_id=$1) plans,(SELECT count(*)::int FROM records WHERE owner_id=$1) records",
      [id],
    );
    return { ...user, ...counts.rows[0] };
  }
  async insertUser(c: any, data: any) {
    const r = await c.query(
      `INSERT INTO users(name,email,phone,password_hash,role,active) VALUES($1,$2,$3,$4,$5,$6) RETURNING id`,
      [
        data.name,
        data.email,
        data.phone,
        data.password_hash,
        data.role,
        data.active,
      ],
    );
    return this.user(r.rows[0].id, c);
  }
  async updateUser(c: any, id: number, data: any) {
    const keys = Object.keys(data);
    if (
      keys.some(
        (k) => !["name", "email", "phone", "role", "active"].includes(k),
      )
    )
      throw Error("Invalid field");
    await c.query(
      `UPDATE users SET ${keys.map((k, i) => `${k}=$${i + 1}`).join(",")} WHERE id=$${keys.length + 1}`,
      [...keys.map((k) => data[k]), id],
    );
    return this.user(id, c);
  }
  async activeAdmins(c: any) {
    return (
      await c.query(
        "SELECT count(*)::int n FROM users WHERE role='admin' AND active=true",
      )
    ).rows[0].n;
  }
  async revoke(c: any, id: number) {
    await c.query("DELETE FROM sessions WHERE user_id=$1", [id]);
    await c.query(
      "UPDATE password_resets SET used_at=now() WHERE user_id=$1 AND used_at IS NULL",
      [id],
    );
  }
  async deleteEmpty(c: any, id: number) {
    const used = await c.query(
      "SELECT id FROM vehicles WHERE owner_id=$1 UNION ALL SELECT id FROM plans WHERE owner_id=$1 UNION ALL SELECT id FROM records WHERE owner_id=$1 LIMIT 1",
      [id],
    );
    if (used.rowCount)
      fail(
        "Người dùng đã có dữ liệu xe hoặc bảo dưỡng. Hãy khóa tài khoản để giữ lịch sử.",
      );
    await c.query("DELETE FROM notifications WHERE user_id=$1", [id]);
    await c.query("DELETE FROM categories WHERE owner_id=$1", [id]);
    await c.query("DELETE FROM settings WHERE owner_id=$1", [id]);
    await c.query("DELETE FROM users WHERE id=$1", [id]);
  }
  async vehicles(q: PageQuery) {
    const p = pageInput(q),
      v: any[] = [],
      w: string[] = [];
    for (const key of ["owner_id", "brand_id", "model_id", "type_id"])
      if (q[key] !== undefined) {
        v.push(integer(q[key], key, 1));
        w.push(`v.${key}=$${v.length}`);
      }
    const archived = queryBool(q.archived, "Lưu trữ");
    if (archived !== undefined) {
      v.push(archived);
      w.push(`v.archived=$${v.length}`);
    }
    if (p.q) {
      v.push(searchPattern(p.q));
      w.push(
        `(COALESCE(v.plate,'') ILIKE $${v.length} OR v.brand ILIKE $${v.length} OR v.model ILIKE $${v.length} OR b.name ILIKE $${v.length} OR m.name ILIKE $${v.length} OR u.name ILIKE $${v.length} OR u.email ILIKE $${v.length})`,
      );
    }
    const clause = w.length ? "WHERE " + w.join(" AND ") : "",
      from =
        "FROM vehicles v JOIN users u ON u.id=v.owner_id LEFT JOIN vehicle_types t ON t.id=v.type_id LEFT JOIN vehicle_brands b ON b.id=v.brand_id LEFT JOIN vehicle_models m ON m.id=v.model_id";
    const count = await this.db.query(
      `SELECT count(*)::int total ${from} ${clause}`,
      v,
    );
    const rows = await this.db.query(
      `SELECT v.id,v.owner_id,v.brand,v.model,v.plate,v.year,v.odometer,v.archived,v.brand_id,v.model_id,v.type_id,t.name type_name,b.name catalog_brand_name,m.name catalog_model_name,u.name owner_name,u.email owner_email ${from} ${clause} ORDER BY v.id DESC LIMIT $${v.length + 1} OFFSET $${v.length + 2}`,
      [...v, p.page_size, p.offset],
    );
    return {
      items: rows.rows,
      total: count.rows[0].total,
      page: p.page,
      page_size: p.page_size,
    };
  }
  async vehicle(id: number) {
    const r = await this.db.query(
      "SELECT v.*,u.name owner_name,u.email owner_email,t.name type_name,b.name catalog_brand_name,m.name catalog_model_name FROM vehicles v JOIN users u ON u.id=v.owner_id LEFT JOIN vehicle_types t ON t.id=v.type_id LEFT JOIN vehicle_brands b ON b.id=v.brand_id LEFT JOIN vehicle_models m ON m.id=v.model_id WHERE v.id=$1",
      [id],
    );
    if (!r.rows[0]) throw new NotFoundException("Không tìm thấy xe.");
    return r.rows[0];
  }
  async history(id: number, q: PageQuery) {
    await this.vehicle(id);
    const p = pageInput(q);
    const count = await this.db.query(
      "SELECT count(*)::int total FROM records WHERE vehicle_id=$1",
      [id],
    );
    const r = await this.db.query(
      "SELECT r.*,k.name category_name FROM records r JOIN categories k ON k.id=r.category_id WHERE r.vehicle_id=$1 ORDER BY r.performed_date DESC,r.id DESC LIMIT $2 OFFSET $3",
      [id, p.page_size, p.offset],
    );
    return {
      items: r.rows,
      total: count.rows[0].total,
      page: p.page,
      page_size: p.page_size,
    };
  }
  async dashboard() {
    const counts = await this.db.query(
      "SELECT (SELECT count(*)::int FROM users WHERE role='user') users,(SELECT count(*)::int FROM users WHERE role='user' AND active) active_users,(SELECT count(*)::int FROM users WHERE role='admin' AND active) active_admins,(SELECT count(*)::int FROM vehicles) vehicles,(SELECT count(*)::int FROM vehicles WHERE archived) archived_vehicles,(SELECT count(*)::int FROM vehicle_brands WHERE active) active_brands,(SELECT count(*)::int FROM vehicle_models m JOIN vehicle_brands b ON b.id=m.brand_id LEFT JOIN vehicle_types t ON t.id=m.type_id WHERE m.active AND b.active AND (m.type_id IS NULL OR t.active)) active_models,(SELECT count(*)::int FROM vehicle_types WHERE active) active_types",
    );
    const brands = await this.db.query(
      "SELECT COALESCE(b.name,v.brand) name,count(*)::int vehicles FROM vehicles v LEFT JOIN vehicle_brands b ON b.id=v.brand_id GROUP BY COALESCE(b.name,v.brand) ORDER BY vehicles DESC,name LIMIT 10",
    );
    return { ...counts.rows[0], top_brands: brands.rows };
  }
  async logs(q: PageQuery) {
    const p = pageInput(q),
      v: any[] = [],
      w: string[] = [];
    for (const key of ["action", "entity", "actor_id"])
      if (q[key] !== undefined) {
        v.push(
          key === "actor_id"
            ? integer(q[key], "Admin", 1)
            : String(q[key]).slice(0, 100),
        );
        w.push(`a.${key}=$${v.length}`);
      }
    const clause = w.length ? "WHERE " + w.join(" AND ") : "";
    const total = await this.db.query(
      `SELECT count(*)::int total FROM admin_audit_logs a ${clause}`,
      v,
    );
    const rows = await this.db.query(
      `SELECT a.*,u.name actor_name FROM admin_audit_logs a LEFT JOIN users u ON u.id=a.actor_id ${clause} ORDER BY a.id DESC LIMIT $${v.length + 1} OFFSET $${v.length + 2}`,
      [...v, p.page_size, p.offset],
    );
    return {
      items: rows.rows,
      total: total.rows[0].total,
      page: p.page,
      page_size: p.page_size,
    };
  }
}
