import { Body, Controller, Param, Post } from "@nestjs/common";
import type { QueuedVerificationResponse } from "@release-guard/contracts";
import { CreateManualVerificationDto } from "./dto/create-manual-verification.dto.ts";
import { VerificationService } from "./verification.service.ts";

@Controller("projects")
export class VerificationController {
  constructor(private readonly verification: VerificationService) {}

  @Post(":projectId/runs")
  createManual(
    @Param("projectId") projectId: string,
    @Body() request: CreateManualVerificationDto,
  ): Promise<QueuedVerificationResponse> {
    return this.verification.createManual(projectId, request.environmentId);
  }
}
