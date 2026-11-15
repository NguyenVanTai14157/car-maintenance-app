import { Module } from "@nestjs/common";
import {
  AdminBannersController,
  PublicBannersController,
} from "./banners.controller";
import { BannersRepository } from "./banners.repository";
import { BannersService } from "./banners.service";

@Module({
  controllers: [AdminBannersController, PublicBannersController],
  providers: [BannersRepository, BannersService],
})
export class BannersModule {}
