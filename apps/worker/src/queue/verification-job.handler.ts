import type { VerificationQueueJobV1 } from "@release-guard/contracts";
import type {
  VerificationJobContext,
  VerificationJobHandler,
} from "./verification-job.processor.ts";

export const handleVerificationJob: VerificationJobHandler = async (
  payload: VerificationQueueJobV1,
  _context: VerificationJobContext,
) => {
  // Failing explicitly prevents a job from being claimed until a concrete runner
  // is wired into CheckRunExecutionService in the runner implementation task.
  throw new Error(
    `Verification execution is not implemented for CheckRun ${payload.checkRunId}`,
  );
};
