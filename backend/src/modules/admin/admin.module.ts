import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CatalogModule } from "../catalog/catalog.module";
import { AdminController } from "./admin.controller";
import { AdminRepository } from "./admin.repository";
import { AdminUsersService } from "./admin-users.service";
@Module({
  imports: [AuthModule, CatalogModule],
  controllers: [AdminController],
  providers: [AdminRepository, AdminUsersService],
})
export class AdminModule {}
