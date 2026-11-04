import { Module } from "@nestjs/common";
import { GaragesController } from "./garages.controller";
import { GaragesRepository } from "./garages.repository";
import { GaragesService } from "./garages.service";
@Module({
  controllers: [GaragesController],
  providers: [GaragesService, GaragesRepository],
  exports: [GaragesService],
})
export class GaragesModule {}
