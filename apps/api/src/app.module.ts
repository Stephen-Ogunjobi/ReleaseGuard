import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { fileURLToPath } from "node:url";
import { AppController } from "./app.controller.ts";
import { validateEnvironment } from "./config/environment.validation.ts";
import { DatabaseModule } from "./database/database.module.ts";

const rootEnvironmentFile = fileURLToPath(new URL("../../../.env", import.meta.url));

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      envFilePath: rootEnvironmentFile,
      isGlobal: true,
      validate: validateEnvironment,
    }),
    DatabaseModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
