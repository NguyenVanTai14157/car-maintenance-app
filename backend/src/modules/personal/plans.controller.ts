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
import { PlansService } from "./plans.service";
import { InboxService } from "./inbox.service";
@Controller("plans")
export class PlansController {
  constructor(
    @Inject(PlansService) private readonly service: PlansService,
    @Inject(InboxService) private readonly inbox: InboxService,
  ) {}
  private async mutate(r: AuthenticatedRequest, run: () => Promise<any>) {
    const result = await run();
    await this.inbox.scan(r.user.id).catch(() => {});
    return result;
  }
  @Get() list(@Req() r: AuthenticatedRequest) {
    return this.service.list(r.user.id);
  }
  @Get(":id") get(@Req() r: AuthenticatedRequest, @Param("id") id: string) {
    return this.service.get(r.user.id, integer(id, "ID", 1));
  }
  @Post() create(@Req() r: AuthenticatedRequest, @Body() b: any) {
    return this.mutate(r, () => this.service.save(r.user.id, null, b));
  }
  @Patch(":id") update(
    @Req() r: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() b: any,
  ) {
    return this.mutate(r, () =>
      this.service.save(r.user.id, integer(id, "ID", 1), b),
    );
  }
  @Post(":id/cancel") cancel(
    @Req() r: AuthenticatedRequest,
    @Param("id") id: string,
  ) {
    return this.mutate(r, () =>
      this.service.cancel(r.user.id, integer(id, "ID", 1)),
    );
  }
  @Post("from-record/:id") next(
    @Req() r: AuthenticatedRequest,
    @Param("id") id: string,
  ) {
    return this.mutate(r, () =>
      this.service.fromRecord(r.user.id, integer(id, "ID", 1)),
    );
  }
}
