import type { AuthenticatedRequest } from "../../common/types/authenticated-request";
import { Inject, Injectable } from "@nestjs/common";
import { NotificationsRepository } from "./notifications.repository";
@Injectable()
export class NotificationsService {
  constructor(
    @Inject(NotificationsRepository)
    private readonly repository: NotificationsRepository,
  ) {}
  async notifications(r: AuthenticatedRequest) {
    return (await this.repository.listForUser([r.user.id])).rows;
  }
  async read(r: AuthenticatedRequest) {
    await this.repository.markAllRead([r.user.id]);
    return { ok: true };
  }
}
