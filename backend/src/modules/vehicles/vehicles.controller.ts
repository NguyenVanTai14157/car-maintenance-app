import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Req,
} from "@nestjs/common";
import type { AuthenticatedRequest } from "../../common/types/authenticated-request";
import type { VehiclesInput } from "./dto/input.dto";
import { VehiclesService } from "./vehicles.service";
@Controller("")
export class VehiclesController {
  constructor(
    @Inject(VehiclesService)
    private readonly service: VehiclesService,
  ) {}
  @Get("vehicles")
  async vehicles(
    @Req()
    r: AuthenticatedRequest,
  ) {
    return this.service.vehicles(r);
  }
  @Post("vehicles")
  async createVehicle(
    @Req()
    r: AuthenticatedRequest,
    @Body()
    b: VehiclesInput,
  ) {
    return this.service.createVehicle(r, b);
  }
  @Patch("vehicles/:id")
  async updateVehicle(
    @Req()
    r: AuthenticatedRequest,
    @Param("id")
    id: string,
    @Body()
    b: VehiclesInput,
  ) {
    return this.service.updateVehicle(r, id, b);
  }
}
