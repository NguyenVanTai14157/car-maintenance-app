import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from "@nestjs/common";
import { AppointmentsService } from "../appointments/appointments.service";
@Injectable()
export class ReminderScheduler
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private timer?: ReturnType<typeof setInterval>;
  private readonly logger = new Logger(ReminderScheduler.name);
  constructor(
    @Inject(AppointmentsService)
    private readonly appointments: AppointmentsService,
  ) {}
  async onApplicationBootstrap() {
    await this.appointments.reminders();
    this.timer = setInterval(() => {
      void this.appointments
        .reminders()
        .catch(() => this.logger.error("Reminder scan failed"));
    }, 60000);
    this.timer.unref();
  }
  onApplicationShutdown() {
    if (this.timer) clearInterval(this.timer);
  }
}
