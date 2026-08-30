import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { readPositiveInteger } from "@release-guard/config";
import { AppModule } from "./app.module.ts";

async function bootstrap(): Promise<void> {
  const port = readPositiveInteger("API_PORT", 3000);
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();
  await app.listen(port, "0.0.0.0");

  Logger.log(`API listening on http://localhost:${port}`, "Bootstrap");
}

await bootstrap();
