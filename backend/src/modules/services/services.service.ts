import { NotFoundException } from "@nestjs/common";
import type { AuthenticatedRequest } from "../../common/types/authenticated-request";
import { allow, integer, text } from "../../common/validation/input";
import type { ServicesInput } from "./dto/input.dto";
import { Inject, Injectable } from "@nestjs/common";
import { ServicesRepository } from "./services.repository";
@Injectable()
export class ServicesService {
  constructor(
    @Inject(ServicesRepository)
    private readonly repository: ServicesRepository,
  ) {}
  async services(r: AuthenticatedRequest) {
    return (await this.repository.listVisible([r.user.role === "admin"])).rows;
  }
  async createService(r: AuthenticatedRequest, b: ServicesInput) {
    allow(r.user, ["admin"]);
    return this.saveService(null, b);
  }
  async updateService(r: AuthenticatedRequest, id: string, b: ServicesInput) {
    allow(r.user, ["admin"]);
    return this.saveService(integer(id, "ID", 1), b);
  }
  async saveService(id: number | null, b: ServicesInput) {
    const checklist = text(b.checklistText, "Checklist", 2000)
      .split("\n")
      .map((s: string) => s.trim())
      .filter(Boolean);
    const params = [
      text(b.name, "Tên dịch vụ", 100),
      text(b.description, "Mô tả", 2000, false),
      integer(b.price, "Giá", 0, 100000000),
      integer(b.duration, "Thời gian", 15, 480),
      JSON.stringify(checklist),
      b.active !== false,
    ];
    const result = (
      await this.repository.save(id ? [...params, id] : params, undefined, id)
    ).rows[0];
    if (!result) throw new NotFoundException("Không tìm thấy dịch vụ.");
    return result;
  }
}
