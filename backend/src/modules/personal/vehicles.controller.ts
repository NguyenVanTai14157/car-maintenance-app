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
import { PersonalVehiclesService } from "./catalog.service";
import { InboxService } from "./inbox.service";
@Controller("vehicles")
export class PersonalVehiclesController {
  constructor(
    @Inject(PersonalVehiclesService)
    private readonly service: PersonalVehiclesService,
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
  @Post(":id/archive") archive(
    @Req() r: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() b: any,
  ) {
    return this.mutate(r, () =>
      this.service.archive(r.user.id, integer(id, "ID", 1), b),
    );
  }
  @Delete(":id") remove(
    @Req() r: AuthenticatedRequest,
    @Param("id") id: string,
  ) {
    return this.mutate(r, () =>
      this.service.remove(r.user.id, integer(id, "ID", 1)),
    );
  }
}
