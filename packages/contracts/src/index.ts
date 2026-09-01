export interface HealthResponse {
  status: "ok";
  service: string;
  timestamp: string;
}

export interface ReleaseRecord {
  id: string;
  version: string;
  createdAt: string;
}

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
