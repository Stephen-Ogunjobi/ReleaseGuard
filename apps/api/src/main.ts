import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.ts";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const port = app.get(ConfigService).getOrThrow<number>("API_PORT");

  app.enableShutdownHooks();
  await app.listen(port, "0.0.0.0");

  Logger.log(`API listening on http://localhost:${port}`, "Bootstrap");
}

await bootstrap();
