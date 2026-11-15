import { AdminModule } from "./modules/admin/admin.module";
import { CatalogModule } from "./modules/catalog/catalog.module";
import { Module } from "@nestjs/common";
import { DatabaseModule } from "./database/database.module";
import { AuthModule } from "./modules/auth/auth.module";
import { RealtimeModule } from "./modules/realtime/realtime.module";
import { PersonalModule } from "./modules/personal/personal.module";
import { BannersModule } from "./modules/banners/banners.module";
import { HealthController } from "./health.controller";
import { SystemLogsController } from "./modules/admin/system-logs.controller";
@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    RealtimeModule,
    PersonalModule,
    CatalogModule,
    AdminModule,
    BannersModule,
  ],
  controllers: [HealthController, SystemLogsController],
})
export class AppModule {}
