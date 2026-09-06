import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.ts";
import { VerificationQueueModule } from "../queue/verification-queue.module.ts";
import { RunController } from "./run.controller.ts";
import { VerificationController } from "./verification.controller.ts";
import { VerificationService } from "./verification.service.ts";

@Module({
  imports: [DatabaseModule, VerificationQueueModule],
  controllers: [VerificationController, RunController],
  providers: [VerificationService],
})
export class VerificationModule {}
