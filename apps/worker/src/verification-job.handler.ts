import type { VerificationQueueJobV1 } from "@release-guard/contracts";
import type {
  VerificationJobContext,
  VerificationJobHandler,
} from "./verification-job.processor.ts";

export const handleVerificationJob: VerificationJobHandler = async (
  payload: VerificationQueueJobV1,
  _context: VerificationJobContext,
) => {
  // Failing explicitly prevents valid work from being falsely acknowledged before
  // the verification domain processor is implemented in the next task.
  throw new Error(
    `Verification execution is not implemented for CheckRun ${payload.checkRunId}`,
  );
};
