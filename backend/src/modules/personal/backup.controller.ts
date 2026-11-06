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
import { BackupService } from "./backup.service";
import { InboxService } from "./inbox.service";
@Controller("backup")
export class BackupController {
  constructor(
    @Inject(BackupService) private readonly service: BackupService,
    @Inject(InboxService) private readonly inbox: InboxService,
  ) {}
  private async mutate(r: AuthenticatedRequest, run: () => Promise<any>) {
    const result = await run();
    await this.inbox.scan(r.user.id).catch(() => {});
    return result;
  }
  @Get() get(@Req() r: AuthenticatedRequest) {
    return this.service.export(r.user.id);
  }
  @Post("restore") restore(@Req() r: AuthenticatedRequest, @Body() b: any) {
    return this.mutate(r, () => this.service.restore(r.user.id, b));
  }
}
