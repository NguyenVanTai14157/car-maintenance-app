import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from "@nestjs/common";
import { PersonalRepository } from "./personal.repository";
import { planStatus, today, bool } from "./personal.rules";
import { integer } from "../../common/validation/input";
@Injectable()
export class InboxService {
  constructor(
    @Inject(PersonalRepository) private readonly repo: PersonalRepository,
  ) {}
  scan(uid: number) {
    return this.repo.transaction(uid, async (c) => {
      const settings = await this.repo.settings(uid, c);
      if (!settings?.notifications) return;
      for (const p of await this.repo.plans(uid, c)) {
        if (p.vehicle_archived) continue;
        const state = planStatus(p);
        if (!["soon", "due", "overdue"].includes(state.status)) continue;
        const reasons = state.reasons
          .map((r) =>
            r === "date"
              ? `theo ngày ${p.due_date}`
              : `theo km ${p.due_km.toLocaleString("vi-VN")} (hiện tại ${p.current_km.toLocaleString("vi-VN")} km)`,
          )
          .join(" và ");
        const label = {
          soon: "Sắp đến hạn",
          due: "Đến hạn",
          overdue: "Quá hạn",
        }[state.status];
        await this.repo.notice(
          uid,
          p.id,
          `${p.id}:${state.status}:${state.reasons.join(",")}:${today()}`,
          `${p.category_name} · ${p.plate || p.brand + " " + p.model}: ${label} ${reasons}.`,
          c,
        );
      }
    });
  }
  async list(uid: number) {
    await this.scan(uid);
    return this.repo.notices(uid);
  }
  async read(uid: number) {
    await this.repo.readNotices(uid);
    return { ok: true };
  }
}
@Injectable()
export class PersonalSettingsService {
  constructor(
    @Inject(PersonalRepository) private readonly repo: PersonalRepository,
  ) {}
  get(uid: number) {
    return this.repo.settings(uid);
  }
  save(uid: number, b: any) {
    const data = {
      notifications: bool(b.notifications, "Thông báo"),
      remind_days: integer(b.remind_days, "Nhắc trước ngày", 0, 365),
      remind_km: integer(b.remind_km, "Nhắc trước km", 0, 100000),
      remind_hour: integer(b.remind_hour, "Giờ nhắc", 0, 23),
    };
    return this.repo.transaction(uid, (c) =>
      this.repo.updateSettings(uid, data, c),
    );
  }
}
@Injectable()
export class PersonalReminderScheduler
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  private logger = new Logger(PersonalReminderScheduler.name);
  constructor(
    @Inject(PersonalRepository) private readonly repo: PersonalRepository,
    @Inject(InboxService) private readonly inbox: InboxService,
  ) {}
  async scan() {
    if (this.running) return;
    this.running = true;
    try {
      for (const uid of await this.repo.ownerIds()) await this.inbox.scan(uid);
    } catch {
      this.logger.error("Personal reminders scan failed");
    } finally {
      this.running = false;
    }
  }
  async onApplicationBootstrap() {
    await this.scan();
    this.timer = setInterval(() => void this.scan(), 60000);
    this.timer.unref();
  }
  onApplicationShutdown() {
    if (this.timer) clearInterval(this.timer);
  }
}
