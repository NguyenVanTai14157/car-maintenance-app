import { Module } from "@nestjs/common";
import { RealtimeGateway } from "./realtime.gateway";
import { RealtimeAuthService } from "./realtime-auth.service";
@Module({ providers: [RealtimeGateway, RealtimeAuthService] })
export class RealtimeModule {}
