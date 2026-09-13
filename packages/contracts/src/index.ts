export interface HealthResponse {
  status: "ok";
  service: string;
  timestamp: string;
}

export type {
  CreateManualVerificationRequest,
  QueuedCheckRunResponse,
  QueuedVerificationResponse,
} from "./manual-verification.ts";
export type {
  AttemptResultResponse,
  AttemptResultStatus,
  CheckResultResponse,
  CheckRunResultResponse,
  FailureClassification,
  RunResultStatus,
  SelectedCheckVersionResponse,
  VerificationRunResultResponse,
} from "./run-result.ts";

export {
  createVerificationQueueJob,
  parseVerificationQueueJob,
  verificationQueueJobId,
  VERIFICATION_QUEUE_JOB_NAME,
  VERIFICATION_QUEUE_NAME,
  VERIFICATION_QUEUE_SCHEMA_VERSION,
  type CreateVerificationQueueJobInput,
  type VerificationQueueJobV1,
} from "./verification-queue.ts";
