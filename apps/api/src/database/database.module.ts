import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseService } from "./database.service.ts";

@Module({
  imports: [ConfigModule],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
