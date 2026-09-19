import { loadWorkerEnvironment } from "@release-guard/config";
import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { handleVerificationJob } from "./verification-job.handler.ts";
import {
  createWorkerRuntime,
  registerShutdownSignals,
} from "./worker-runtime.ts";

const rootEnvironmentFile = fileURLToPath(
  new URL("../../../.env", import.meta.url),
);

// Local development reads the root file; deployed process variables retain precedence.
config({ path: rootEnvironmentFile, quiet: true });
const environment = loadWorkerEnvironment();
const runtime = await createWorkerRuntime(environment, handleVerificationJob);
registerShutdownSignals(runtime);

console.log(
  `ReleaseGuard worker connected for ${environment.nodeEnv}; ` +
    `concurrency=${environment.concurrency}; ` +
    `attemptTimeoutMs=${environment.attemptTimeoutMs}`,
);
