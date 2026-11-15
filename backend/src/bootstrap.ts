import { NestFactory } from "@nestjs/core";
import { json, static as expressStatic } from "express";
import { mkdir } from "node:fs/promises";
import { AppModule } from "./app.module";
import { ApiExceptionFilter } from "./common/filters/api-exception.filter";
import { captureSystemLog } from "./common/system-logs";
import { migrate } from "./database/connection";
import { bannerUploadDir } from "./modules/banners/banners.service";
export async function bootstrap() {
  if (!process.env.DATABASE_URL || !process.env.JWT_SECRET)
    throw Error("Configure backend/.env");
  await migrate();
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  app.use(captureSystemLog);
  app.use(json({ limit: "32mb" }));
  await mkdir(bannerUploadDir, { recursive: true });
  app.use(
    "/uploads/banners",
    expressStatic(bannerUploadDir, { maxAge: "7d", immutable: true }),
  );
  app.enableCors();
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT || 3000), "0.0.0.0");
  return app;
}
