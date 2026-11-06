import {
  RecoveryRepository,
  RecoveryMailer,
  RecoveryService,
} from "./recovery.service";
import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AuthGuard } from "../../common/guards/auth.guard";
import { AuthController } from "./auth.controller";
import { AuthRepository } from "./auth.repository";
import { AuthService } from "./auth.service";
@Module({
  controllers: [AuthController],
  providers: [
    RecoveryRepository,
    RecoveryMailer,
    RecoveryService,
    AuthService,
    AuthRepository,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
