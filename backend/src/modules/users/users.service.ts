import { hash } from "bcryptjs";
import type { AuthenticatedRequest } from "../../common/types/authenticated-request";
import {
  allow,
  contact,
  fail,
  integer,
  password,
  publicUser,
  text,
} from "../../common/validation/input";
import type { UsersInput } from "./dto/input.dto";
import { Inject, Injectable } from "@nestjs/common";
import { UsersRepository } from "./users.repository";
@Injectable()
export class UsersService {
  constructor(
    @Inject(UsersRepository)
    private readonly repository: UsersRepository,
  ) {}
  async staff(r: AuthenticatedRequest) {
    allow(r.user, ["admin", "receptionist"]);
    return (await this.repository.listStaff([])).rows;
  }
  async users(r: AuthenticatedRequest) {
    allow(r.user, ["admin"]);
    return (await this.repository.listUsers([])).rows;
  }
  async createUser(r: AuthenticatedRequest, b: UsersInput) {
    allow(r.user, ["admin"]);
    if (!["admin", "receptionist", "technician"].includes(b.role))
      fail("Chọn vai trò nhân viên.");
    const c = contact(b);
    return publicUser(
      (
        await this.repository.insertStaff([
          text(b.name, "Họ tên", 100),
          c.email,
          c.phone,
          b.role,
          await hash(password(b.password), 12),
        ])
      ).rows[0],
    );
  }
  async user(r: AuthenticatedRequest, raw: string, b: UsersInput) {
    allow(r.user, ["admin"]);
    const id = integer(raw, "ID", 1);
    if (id === r.user.id) fail("Dùng Hồ sơ để sửa tài khoản của bạn.");
    if (!["customer", "admin", "receptionist", "technician"].includes(b.role))
      fail("Vai trò không hợp lệ.");
    return this.repository.transaction(async (c) => {
      await this.repository.lockAccountChanges([], c);
      const old = (await this.repository.lockUser([id], c)).rows[0];
      if (!old) fail("Tài khoản không tồn tại.");
      if (old.role !== b.role || b.active === false) {
        const jobs = await this.repository.findTechnicianActiveJobs([id], c);
        if (jobs.rowCount)
          fail(
            "Cần chuyển công việc đang phụ trách trước khi khóa hoặc đổi vai trò.",
          );
        const own = await this.repository.findCustomerActiveVisits([id], c);
        if (own.rowCount && old.role !== b.role)
          fail("Khách hàng còn lịch đang xử lý.");
        await this.repository.revokeSessions([id], c);
      }
      const cc = contact(b);
      return publicUser(
        (
          await this.repository.updateUser(
            [
              text(b.name, "Tên", 100),
              cc.email,
              cc.phone,
              b.role,
              b.active !== false,
              id,
            ],
            c,
          )
        ).rows[0],
      );
    });
  }
}
