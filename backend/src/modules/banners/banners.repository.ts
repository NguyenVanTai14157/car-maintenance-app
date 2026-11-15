import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";

@Injectable()
export class BannersRepository {
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}

  list(activeOnly = false) {
    return this.db.query(
      `SELECT id,title,action_text,target_path,image_path,image_paths,position,active,created_at,updated_at FROM home_banners ${activeOnly ? "WHERE active=true" : ""} ORDER BY position,id`,
    ).then((r) => r.rows);
  }

  async get(id: number, c: any = this.db) {
    const r = await c.query(
      "SELECT id,title,action_text,target_path,image_path,image_paths,position,active,created_at,updated_at FROM home_banners WHERE id=$1" + (c === this.db ? "" : " FOR UPDATE"),
      [id],
    );
    if (!r.rows[0]) throw new NotFoundException("Không tìm thấy banner.");
    return r.rows[0];
  }

  create(actor: number, data: any) {
    return this.db.transaction(async (c) => {
      const row = (
        await c.query(
          "INSERT INTO home_banners(title,action_text,target_path,image_path,image_paths,position,active) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id,title,action_text,target_path,image_path,image_paths,position,active,created_at,updated_at",
          [
            data.title,
            data.action_text,
            data.target_path,
            data.image_paths[0],
            data.image_paths,
            data.position,
            data.active,
          ],
        )
      ).rows[0];
      await this.audit(c, actor, "banner.create", row.id, [
        "title",
        "action_text",
        "target_path",
        "image_path",
        "position",
        "active",
      ]);
      return row;
    });
  }

  update(actor: number, id: number, data: any) {
    return this.db.transaction(async (c) => {
      const old = await this.get(id, c);
      const row = (
        await c.query(
          "UPDATE home_banners SET title=$1,action_text=$2,target_path=$3,image_path=$4,image_paths=$5,position=$6,active=$7,updated_at=now() WHERE id=$8 RETURNING id,title,action_text,target_path,image_path,image_paths,position,active,created_at,updated_at",
          [
            data.title,
            data.action_text,
            data.target_path,
            data.image_paths?.[0] ?? old.image_path,
            data.image_paths ?? old.image_paths,
            data.position,
            data.active,
            id,
          ],
        )
      ).rows[0];
      await this.audit(
        c,
        actor,
        "banner.update",
        id,
        Object.keys(data).filter((key) => key !== "image_data"),
      );
      return { row, old };
    });
  }

  remove(actor: number, id: number) {
    return this.db.transaction(async (c) => {
      const old = await this.get(id, c);
      await c.query("DELETE FROM home_banners WHERE id=$1", [id]);
      await this.audit(c, actor, "banner.delete", id, []);
      return old;
    });
  }

  private audit(
    c: any,
    actor: number,
    action: string,
    target: number,
    fields: string[],
  ) {
    return c.query(
      "INSERT INTO admin_audit_logs(actor_id,action,entity,target_id,details) VALUES($1,$2,'home_banners',$3,$4::jsonb)",
      [actor, action, target, JSON.stringify({ fields })],
    );
  }
}
