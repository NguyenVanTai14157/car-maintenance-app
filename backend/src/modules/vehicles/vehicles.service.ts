import { ForbiddenException } from "@nestjs/common";
import type { AuthenticatedRequest } from "../../common/types/authenticated-request";
import { allow, fail, integer, text } from "../../common/validation/input";
import type { VehiclesInput } from "./dto/input.dto";
import { Inject, Injectable } from "@nestjs/common";
import { VehiclesRepository } from "./vehicles.repository";
@Injectable()
export class VehiclesService {
  constructor(
    @Inject(VehiclesRepository)
    private readonly repository: VehiclesRepository,
  ) {}
  async vehicles(r: AuthenticatedRequest) {
    allow(r.user, ["customer", "admin", "receptionist"]);
    return (
      await this.repository.listVisible([r.user.role !== "customer", r.user.id])
    ).rows;
  }
  async createVehicle(r: AuthenticatedRequest, b: VehiclesInput) {
    allow(r.user, ["customer"]);
    return this.saveVehicle(r.user, null, b);
  }
  async updateVehicle(r: AuthenticatedRequest, id: string, b: VehiclesInput) {
    allow(r.user, ["customer"]);
    return this.saveVehicle(r.user, integer(id, "ID", 1), b);
  }
  async saveVehicle(u: any, id: number | null, b: VehiclesInput) {
    return this.repository.transaction(async (c) => {
      const plate = text(b.plate, "Biển số", 20)
        .toUpperCase()
        .replace(/[\s.-]/g, "");
      if (!/^[A-Z0-9]{5,15}$/.test(plate)) fail("Biển số không hợp lệ.");
      const params = [
        plate,
        text(b.brand, "Hãng", 80),
        text(b.model, "Dòng xe", 80),
        integer(b.year, "Năm", 1950, new Date().getFullYear() + 1),
        integer(b.odometer, "Số km", 0, 10000000),
      ];
      if (id) {
        const old = (await this.repository.findOwned([id, u.id], c)).rows[0];
        if (!old) throw new ForbiddenException();
        if (params[4] < old.odometer)
          fail("Số km mới không được nhỏ hơn số km hiện tại.");
      }
      return (
        await this.repository.save(
          id ? [...params, id, u.id] : [...params, u.id],
          c,
          id,
        )
      ).rows[0];
    });
  }
}
