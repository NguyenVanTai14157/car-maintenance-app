import { AdminModule } from "./modules/admin/admin.module";
import { CatalogModule } from "./modules/catalog/catalog.module";
import { Module } from "@nestjs/common";
import { DatabaseModule } from "./database/database.module";
import { AuthModule } from "./modules/auth/auth.module";
import { RealtimeModule } from "./modules/realtime/realtime.module";
import { PersonalModule } from "./modules/personal/personal.module";
import { HealthController } from "./health.controller";
@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    RealtimeModule,
    PersonalModule,
    CatalogModule,
    AdminModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
