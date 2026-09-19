import {
  parseVerificationQueueJob,
  VERIFICATION_QUEUE_JOB_NAME,
  type VerificationQueueJobV1,
} from "@release-guard/contracts";

export interface VerificationQueueJobLike {
  name: string;
  data: unknown;
}

export interface VerificationJobContext {
  attemptTimeoutMs: number;
}

export type VerificationJobHandler = (
  payload: VerificationQueueJobV1,
  context: VerificationJobContext,
) => Promise<void>;

export class UnknownVerificationJobNameError extends Error {
  constructor(name: string) {
    super(`Unknown verification job name: ${name}`);
    this.name = "UnknownVerificationJobNameError";
  }
}

export function createVerificationJobProcessor(
  handler: VerificationJobHandler,
  attemptTimeoutMs: number,
): (job: VerificationQueueJobLike) => Promise<void> {
  return async (job) => {
    if (job.name !== VERIFICATION_QUEUE_JOB_NAME) {
      throw new UnknownVerificationJobNameError(job.name);
    }

    // Redis is an external boundary; compile-time types are not trusted here.
    const payload = parseVerificationQueueJob(job.data);
    await handler(payload, { attemptTimeoutMs });
  };
}
