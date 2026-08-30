import { Controller, Get } from "@nestjs/common";
import type { HealthResponse, ReleaseRecord } from "@release-guard/contracts";

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

  // This placeholder preserves the initial scaffold until release retrieval is
  // replaced by the verification API in the next implementation steps.
  @Get("releases")
  releases(): readonly ReleaseRecord[] {
    return [];
  }
}
