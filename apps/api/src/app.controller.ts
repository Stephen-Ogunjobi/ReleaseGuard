import { Controller, Get } from "@nestjs/common";
import type { HealthResponse } from "@release-guard/contracts";

@Controller()
export class AppController {
  @Get("health")
  health(): HealthResponse {
    return {
      status: "ok",
      service: "api",
      timestamp: new Date().toISOString(),
    };
  }
}
