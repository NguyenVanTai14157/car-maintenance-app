import { Module } from "@nestjs/common";
import { AppointmentsModule } from "../appointments/appointments.module";
import { NotificationsController } from "./notifications.controller";
import { NotificationsRepository } from "./notifications.repository";
import { NotificationsService } from "./notifications.service";
import { ReminderScheduler } from "./reminder-scheduler.service";
@Module({
  imports: [AppointmentsModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsRepository, ReminderScheduler],
  exports: [NotificationsService],
})
export class NotificationsModule {}
