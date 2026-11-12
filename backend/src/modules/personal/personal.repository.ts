import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";
const columns: Record<string, string[]> = {
  vehicles: [
    "owner_id",
    "brand_id",
    "model_id",
    "type_id",
    "brand",
    "model",
    "plate",
    "year",
    "odometer",
    "image",
    "images",
    "notes",
    "archived",
  ],
  categories: ["owner_id", "name", "active"],
  plans: [
    "owner_id",
    "vehicle_id",
    "category_id",
    "due_date",
    "due_km",
    "remind_days",
    "remind_km",
    "interval_months",
    "interval_km",
    "notes",
    "cancelled",
    "source_record_id",
  ],
  records: [
    "owner_id",
    "vehicle_id",
    "category_id",
    "plan_id",
    "performed_date",
    "odometer",
    "cost",
    "content",
    "notes",
    "images",
    "interval_months",
    "interval_km",
  ],
  settings: [
    "owner_id",
    "notifications",
    "remind_days",
    "remind_km",
    "remind_hour",
    "unit",
  ],
};
@Injectable()
export class PersonalRepository {
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}
  transaction<T>(uid: number, fn: (c: any) => Promise<T>) {
    return this.db.transaction(async (c) => {
      await c.query("SELECT pg_advisory_xact_lock(9099,$1)", [uid]);
      await c.query("SELECT pg_advisory_xact_lock_shared(9097,0)");
      return fn(c);
    });
  }
  async owned(
    table: string,
    id: number,
    uid: number,
    c: any = this.db,
    lock = false,
  ) {
    if (!columns[table]) throw Error("Invalid table");
    const r = await c.query(
      `SELECT * FROM ${table} WHERE id=$1 AND owner_id=$2${lock ? " FOR UPDATE" : ""}`,
      [id, uid],
    );
    if (!r.rows[0])
      throw new NotFoundException("Không tìm thấy dữ liệu của bạn.");
    return r.rows[0];
  }
  async save(
    table: string,
    uid: number,
    id: number | null,
    data: Record<string, unknown>,
    c: any = this.db,
  ) {
    if (!columns[table]) throw Error("Invalid table");
    const clean = { ...data };
    delete clean.owner_id;
    const keys = Object.keys(clean);
    if (keys.some((k) => !columns[table].includes(k)))
      throw Error("Invalid field");
    const values = keys.map((k) =>
      k === "images" ? JSON.stringify(clean[k]) : clean[k],
    );
    const sql = id
      ? `UPDATE ${table} SET ${keys.map((k, i) => `${k}=$${i + 1}`).join(",")} WHERE id=$${keys.length + 1} AND owner_id=$${keys.length + 2} RETURNING *`
      : `INSERT INTO ${table}(${keys.join(",")},owner_id) VALUES(${keys.map((_, i) => "$" + (i + 1)).join(",")},$${keys.length + 1}) RETURNING *`;
    const r = await c.query(sql, id ? [...values, id, uid] : [...values, uid]);
    if (!r.rows[0]) throw new NotFoundException("Không tìm thấy dữ liệu.");
    return r.rows[0];
  }
  async remove(table: string, id: number, uid: number, c: any) {
    if (!["records", "categories", "vehicles"].includes(table))
      throw Error("Invalid table");
    return c.query(
      `DELETE FROM ${table} WHERE id=$1 AND owner_id=$2 RETURNING id`,
      [id, uid],
    );
  }
  async vehicles(uid: number, c: any = this.db) {
    return (
      await c.query(
        "SELECT * FROM vehicles WHERE owner_id=$1 ORDER BY archived,id DESC",
        [uid],
      )
    ).rows;
  }
  async categories(uid: number, c: any = this.db) {
    return (
      await c.query(
        "SELECT * FROM categories WHERE owner_id=$1 ORDER BY active DESC,id",
        [uid],
      )
    ).rows;
  }
  async plans(uid: number, c: any = this.db) {
    return (
      await c.query(
        "SELECT p.*,v.brand,v.model,v.plate,v.odometer current_km,v.archived vehicle_archived,k.name category_name,r.id completed_record_id FROM plans p JOIN vehicles v ON v.id=p.vehicle_id JOIN categories k ON k.id=p.category_id LEFT JOIN records r ON r.plan_id=p.id WHERE p.owner_id=$1 ORDER BY p.id DESC",
        [uid],
      )
    ).rows;
  }
  async records(uid: number, c: any = this.db) {
    return (
      await c.query(
        "SELECT r.*,v.brand,v.model,v.plate,v.archived vehicle_archived,k.name category_name FROM records r JOIN vehicles v ON v.id=r.vehicle_id JOIN categories k ON k.id=r.category_id WHERE r.owner_id=$1 ORDER BY r.performed_date DESC,r.id DESC",
        [uid],
      )
    ).rows;
  }
  async settings(uid: number, c: any = this.db) {
    return (await c.query("SELECT * FROM settings WHERE owner_id=$1", [uid]))
      .rows[0];
  }
  async updateSettings(uid: number, data: any, c: any) {
    return (
      await c.query(
        "UPDATE settings SET notifications=$1,remind_days=$2,remind_km=$3,remind_hour=$4 WHERE owner_id=$5 RETURNING *",
        [
          data.notifications,
          data.remind_days,
          data.remind_km,
          data.remind_hour,
          uid,
        ],
      )
    ).rows[0];
  }
  async usedCategory(uid: number, id: number, c: any) {
    return (
      (
        await c.query(
          "SELECT id FROM plans WHERE owner_id=$1 AND category_id=$2 UNION ALL SELECT id FROM records WHERE owner_id=$1 AND category_id=$2",
          [uid, id],
        )
      ).rowCount > 0
    );
  }
  async usedVehicle(uid: number, id: number, c: any) {
    return (
      (
        await c.query(
          "SELECT id FROM plans WHERE owner_id=$1 AND vehicle_id=$2 UNION ALL SELECT id FROM records WHERE owner_id=$1 AND vehicle_id=$2",
          [uid, id],
        )
      ).rowCount > 0
    );
  }
  async recordForPlan(uid: number, id: number, c: any) {
    return (
      await c.query("SELECT id FROM records WHERE owner_id=$1 AND plan_id=$2", [
        uid,
        id,
      ])
    ).rows[0];
  }
  async nextForRecord(uid: number, id: number, c: any) {
    return (
      await c.query(
        "SELECT id FROM plans WHERE owner_id=$1 AND source_record_id=$2",
        [uid, id],
      )
    ).rows[0];
  }
  async conflictKm(
    uid: number,
    vehicle: number,
    date: string,
    km: number,
    exclude: number,
    c: any,
  ) {
    return (
      (
        await c.query(
          "SELECT id FROM records WHERE owner_id=$1 AND vehicle_id=$2 AND id<>$5 AND ((performed_date<$3::date AND odometer>$4) OR (performed_date>$3::date AND odometer<$4))",
          [uid, vehicle, date, km, exclude],
        )
      ).rowCount > 0
    );
  }
  async notices(uid: number, c: any = this.db) {
    return (
      await c.query(
        "SELECT * FROM notifications WHERE user_id=$1 ORDER BY id DESC LIMIT 200",
        [uid],
      )
    ).rows;
  }
  async notice(
    uid: number,
    plan: number,
    key: string,
    message: string,
    c: any,
  ) {
    await c.query(
      "INSERT INTO notifications(user_id,plan_id,event_key,message) VALUES($1,$2,$3,$4) ON CONFLICT(user_id,event_key) DO NOTHING",
      [uid, plan, key, message],
    );
  }
  async readNotices(uid: number) {
    await this.db.query(
      "UPDATE notifications SET read=true WHERE user_id=$1 AND read=false",
      [uid],
    );
  }
  async ownerIds() {
    return (
      await this.db.query("SELECT id FROM users WHERE active=true")
    ).rows.map((r) => r.id as number);
  }
  async clear(uid: number, c: any) {
    await c.query("DELETE FROM notifications WHERE user_id=$1", [uid]);
    await c.query("DELETE FROM records WHERE owner_id=$1", [uid]);
    await c.query("DELETE FROM plans WHERE owner_id=$1", [uid]);
    await c.query("DELETE FROM vehicles WHERE owner_id=$1", [uid]);
    await c.query("DELETE FROM categories WHERE owner_id=$1", [uid]);
  }
}
