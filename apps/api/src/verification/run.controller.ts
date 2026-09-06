import { Controller, Get, Param } from "@nestjs/common";
import type { VerificationRunResultResponse } from "@release-guard/contracts";
import { VerificationService } from "./verification.service.ts";

@Controller("runs")
export class RunController {
  constructor(private readonly verification: VerificationService) {}

  @Get(":runId")
  getResult(@Param("runId") runId: string): Promise<VerificationRunResultResponse> {
    return this.verification.getResult(runId);
  }
}
