import { loadCommonEnvironment } from "@release-guard/config";
import type { HealthResponse } from "@release-guard/contracts";

const environment = loadCommonEnvironment();
const result: HealthResponse = {
  status: "ok",
  service: "demo-app",
  timestamp: new Date().toISOString(),
};

console.log(JSON.stringify({ environment: environment.nodeEnv, ...result }, null, 2));
