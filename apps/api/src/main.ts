import "reflect-metadata";
import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.ts";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const port = app.get(ConfigService).getOrThrow<number>("API_PORT");

  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );
  app.enableShutdownHooks();
  await app.listen(port, "0.0.0.0");

  Logger.log(`API listening on http://localhost:${port}`, "Bootstrap");
}

await bootstrap();
