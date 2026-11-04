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
import type { GaragesInput } from "./dto/input.dto";
import { GaragesService } from "./garages.service";
@Controller("")
export class GaragesController {
  constructor(
    @Inject(GaragesService)
    private readonly service: GaragesService,
  ) {}
  @Get("garages")
  async garages() {
    return this.service.garages();
  }
  @Post("garages")
  async createGarage(
    @Req()
    r: AuthenticatedRequest,
    @Body()
    b: GaragesInput,
  ) {
    return this.service.createGarage(r, b);
  }
  @Patch("garages/:id")
  async garage(
    @Req()
    r: AuthenticatedRequest,
    @Param("id")
    id: string,
    @Body()
    b: GaragesInput,
  ) {
    return this.service.garage(r, id, b);
  }
}
