import { CatalogModule } from "../catalog/catalog.module";
import { Module } from "@nestjs/common";
import { PersonalRepository } from "./personal.repository";
import { PersonalVehiclesService, CategoriesService } from "./catalog.service";
import { PlansService } from "./plans.service";
import { RecordsService } from "./records.service";
import {
  InboxService,
  PersonalSettingsService,
  PersonalReminderScheduler,
} from "./inbox.service";
import { DashboardService } from "./dashboard.service";
import { BackupService } from "./backup.service";
import { PersonalVehiclesController } from "./vehicles.controller";
import { CategoriesController } from "./categories.controller";
import { PlansController } from "./plans.controller";
import { RecordsController } from "./records.controller";
import { PersonalSettingsController } from "./settings.controller";
import { BackupController } from "./backup.controller";
import { DashboardController } from "./dashboard.controller";
@Module({
  imports: [CatalogModule],
  controllers: [
    PersonalVehiclesController,
    CategoriesController,
    PlansController,
    RecordsController,
    PersonalSettingsController,
    BackupController,
    DashboardController,
  ],
  providers: [
    PersonalRepository,
    PersonalVehiclesService,
    CategoriesService,
    PlansService,
    RecordsService,
    InboxService,
    PersonalSettingsService,
    PersonalReminderScheduler,
    DashboardService,
    BackupService,
  ],
})
export class PersonalModule {}
