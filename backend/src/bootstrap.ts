import { NestFactory } from "@nestjs/core";
import { json } from "express";
import { AppModule } from "./app.module";
import { ApiExceptionFilter } from "./common/filters/api-exception.filter";
import { migrate } from "./database/connection";
export async function bootstrap() {
  if (!process.env.DATABASE_URL || !process.env.JWT_SECRET)
    throw Error("Configure backend/.env");
  await migrate();
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  app.use(json({ limit: "32mb" }));
  app.enableCors();
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT || 3000), "0.0.0.0");
  return app;
}
