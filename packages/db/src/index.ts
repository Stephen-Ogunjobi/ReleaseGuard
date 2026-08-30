import type { ReleaseRecord } from "@release-guard/contracts";

export { createDatabaseClient, type DatabaseClient } from "./client.ts";
export {
  DomainRecordNotFoundError,
  InvalidAttemptTransitionError,
  TerminalAttemptError,
} from "./errors.ts";
export {
  AttemptStatus,
  FailureType,
  RunnerType,
  RunStatus,
  VerificationTriggerType,
} from "./generated/prisma/enums.ts";
export { AttemptService, type TransitionAttemptInput } from "./services/attempt-service.ts";
export {
  CheckVersionService,
  type CreateCheckVersionInput,
} from "./services/check-version-service.ts";

export interface Database {
  listReleases(): Promise<readonly ReleaseRecord[]>;
}

export function createDatabase(databaseUrl: string): Database {
  if (!databaseUrl.startsWith("memory://")) {
    throw new Error("Only memory:// database URLs are supported by the initial scaffold");
  }

  const releases: ReleaseRecord[] = [];
  return {
    async listReleases() {
      return releases;
    },
  };
}
