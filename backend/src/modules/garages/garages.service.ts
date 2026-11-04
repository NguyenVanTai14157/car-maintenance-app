import { NotFoundException } from "@nestjs/common";
import type { AuthenticatedRequest } from "../../common/types/authenticated-request";
import { allow, fail, integer, text } from "../../common/validation/input";
import type { GaragesInput } from "./dto/input.dto";
import { Inject, Injectable } from "@nestjs/common";
import { GaragesRepository } from "./garages.repository";
@Injectable()
export class GaragesService {
  constructor(
    @Inject(GaragesRepository)
    private readonly repository: GaragesRepository,
  ) {}
  async garages() {
    return (await this.repository.list([])).rows;
  }
  async createGarage(r: AuthenticatedRequest, b: GaragesInput) {
    allow(r.user, ["admin"]);
    return (
      await this.repository.insert([
        text(b.name, "Tên gara", 100),
        text(b.address, "Địa chỉ"),
      ])
    ).rows[0];
  }
  async garage(r: AuthenticatedRequest, id: string, b: GaragesInput) {
    allow(r.user, ["admin"]);
    const open = integer(b.open_hour, "Giờ mở", 0, 23),
      close = integer(b.close_hour, "Giờ đóng", 1, 24);
    if (close <= open) fail("Giờ đóng phải sau giờ mở.");
    const result = (
      await this.repository.update([
        text(b.name, "Tên", 100),
        text(b.address, "Địa chỉ"),
        open,
        close,
        integer(b.capacity, "Sức chứa", 1, 100),
        integer(b.cancel_hours, "Hạn hủy", 0, 168),
        integer(b.reminder_hours, "Nhắc trước", 1, 168),
        text(b.notification_template, "Mẫu thông báo", 300),
        b.active !== false,
        integer(id, "ID", 1),
      ])
    ).rows[0];
    if (!result) throw new NotFoundException("Không tìm thấy gara.");
    return result;
  }
}
