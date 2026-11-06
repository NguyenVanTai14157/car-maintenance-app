import { Inject, Injectable, ForbiddenException } from "@nestjs/common";
import { hash } from "bcryptjs";
import { AdminRepository } from "./admin.repository";
import {
  contact,
  password,
  text,
  fail,
  allow,
} from "../../common/validation/input";
import { bool } from "../personal/personal.rules";
import { onlyFields } from "./admin.rules";
import type { UserCreateInput, UserUpdateInput } from "./dto/input.dto";
@Injectable()
export class AdminUsersService {
  constructor(
    @Inject(AdminRepository) private readonly repo: AdminRepository,
  ) {}
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
  async create(actor: any, b: UserCreateInput) {
    allow(actor, ["admin"]);
    onlyFields(b, ["name", "email", "phone", "password", "role", "active"]);
    const c = contact(b);
    if (!c.email) fail("Email là bắt buộc.");
    const role = b.role ?? "user";
    if (!["user", "admin"].includes(role)) fail("Vai trò không hợp lệ.");
    const data = {
      name: text(b.name, "Họ tên", 100),
      ...c,
      role,
      active: b.active === undefined ? true : bool(b.active, "Trạng thái"),
      password_hash: await hash(password(b.password), 12),
    };
    return this.repo.transaction(null, async (tx) => {
      await this.checkAdmin(tx, actor.id);
      const created = await this.repo.insertUser(tx, data);
      await this.repo.audit(tx, actor.id, "user.create", "users", created.id, {
        role: created.role,
        active: created.active,
      });
      return created;
    });
  }
  update(actor: any, id: number, b: UserUpdateInput) {
    allow(actor, ["admin"]);
    onlyFields(b, ["name", "email", "phone", "role", "active"]);
    return this.repo.transaction(id, async (c) => {
      await this.checkAdmin(c, actor.id);
      const old = await this.repo.user(id, c, true),
        data: any = {};
      if (b.name !== undefined) data.name = text(b.name, "Họ tên", 100);
      if (b.email !== undefined || b.phone !== undefined) {
        const info = contact({
          email: b.email === undefined ? old.email : b.email,
          phone: b.phone === undefined ? old.phone : b.phone,
        });
        if (!info.email) fail("Email là bắt buộc.");
        Object.assign(data, info);
      }
      if (b.role !== undefined) {
        if (!["user", "admin"].includes(b.role)) fail("Vai trò không hợp lệ.");
        data.role = b.role;
      }
      if (b.active !== undefined) data.active = bool(b.active, "Trạng thái");
      const next = { ...old, ...data };
      if (actor.id === id && (!next.active || next.role !== "admin"))
        fail("Không thể tự khóa hoặc hạ quyền tài khoản đang quản trị.");
      if (
        old.role === "admin" &&
        old.active &&
        (!next.active || next.role !== "admin") &&
        (await this.repo.activeAdmins(c)) <= 1
      )
        fail("Phải giữ ít nhất một admin đang hoạt động.");
      const result = await this.repo.updateUser(c, id, data);
      if (
        old.role !== next.role ||
        old.active !== next.active ||
        old.email !== next.email
      )
        await this.repo.revoke(c, id);
      if (old.role === "admin" && next.role === "user") {
        await c.query(
          "INSERT INTO settings(owner_id) VALUES($1) ON CONFLICT DO NOTHING",
          [id],
        );
        const has = await c.query(
          "SELECT id FROM categories WHERE owner_id=$1 LIMIT 1",
          [id],
        );
        if (!has.rowCount)
          await c.query(
            "INSERT INTO categories(owner_id,name) VALUES($1,'Thay dầu động cơ'),($1,'Thay lọc gió'),($1,'Kiểm tra phanh'),($1,'Kiểm tra lốp')",
            [id],
          );
      }
      await this.repo.audit(c, actor.id, "user.update", "users", id, {
        fields: Object.keys(data),
        before: { role: old.role, active: old.active },
        after: { role: next.role, active: next.active },
      });
      return result;
    });
  }
  remove(actor: any, id: number) {
    allow(actor, ["admin"]);
    if (actor.id === id) fail("Không thể tự xóa tài khoản đang quản trị.");
    return this.repo.transaction(id, async (c) => {
      await this.checkAdmin(c, actor.id);
      const old = await this.repo.user(id, c, true);
      if (
        old.role === "admin" &&
        old.active &&
        (await this.repo.activeAdmins(c)) <= 1
      )
        fail("Phải giữ ít nhất một admin đang hoạt động.");
      await this.repo.revoke(c, id);
      await this.repo.deleteEmpty(c, id);
      await this.repo.audit(c, actor.id, "user.delete", "users", id, {
        role: old.role,
      });
      return { ok: true };
    });
  }
}
