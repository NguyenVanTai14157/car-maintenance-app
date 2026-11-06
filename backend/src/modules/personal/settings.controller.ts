import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Req,
} from "@nestjs/common";
import type { AuthenticatedRequest } from "../../common/types/authenticated-request";
import { integer } from "../../common/validation/input";
import { PersonalSettingsService } from "./inbox.service";
import { InboxService } from "./inbox.service";
@Controller("settings")
export class PersonalSettingsController {
  constructor(
    @Inject(PersonalSettingsService)
    private readonly service: PersonalSettingsService,
    @Inject(InboxService) private readonly inbox: InboxService,
  ) {}
  private async mutate(r: AuthenticatedRequest, run: () => Promise<any>) {
    const result = await run();
    await this.inbox.scan(r.user.id).catch(() => {});
    return result;
  }
  @Get() get(@Req() r: AuthenticatedRequest) {
    return this.service.get(r.user.id);
  }
  @Patch() save(@Req() r: AuthenticatedRequest, @Body() b: any) {
    return this.mutate(r, () => this.service.save(r.user.id, b));
  }
}
