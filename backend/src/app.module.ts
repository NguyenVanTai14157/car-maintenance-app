import { Module } from "@nestjs/common";
import { RealtimeModule } from "./modules/realtime/realtime.module";
import { DatabaseModule } from "./database/database.module";
import { HealthController } from "./health.controller";
import { AppointmentsModule } from "./modules/appointments/appointments.module";
import { AuthModule } from "./modules/auth/auth.module";
import { GaragesModule } from "./modules/garages/garages.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { ServicesModule } from "./modules/services/services.module";
import { UsersModule } from "./modules/users/users.module";
import { VehiclesModule } from "./modules/vehicles/vehicles.module";
@Module({
  imports: [
    DatabaseModule,
    RealtimeModule,
    AuthModule,
    UsersModule,
    VehiclesModule,
    GaragesModule,
    ServicesModule,
    AppointmentsModule,
    NotificationsModule,
    ReportsModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
