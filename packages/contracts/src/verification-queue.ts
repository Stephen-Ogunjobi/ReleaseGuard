export const VERIFICATION_QUEUE_NAME = "verification";
export const VERIFICATION_QUEUE_JOB_NAME = "execute-check-run";
export const VERIFICATION_QUEUE_PREFIX = "release-guard";
export const VERIFICATION_QUEUE_SCHEMA_VERSION = 1 as const;

export interface VerificationQueueJobV1 {
  schemaVersion: typeof VERIFICATION_QUEUE_SCHEMA_VERSION;
  checkRunId: string;
  correlationId: string;
}

export type CreateVerificationQueueJobInput = Omit<VerificationQueueJobV1, "schemaVersion">;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readIdentifier(value: unknown, name: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${name} must be a non-empty string`);
  }

  return value;
}

export function createVerificationQueueJob(
  input: CreateVerificationQueueJobInput,
): VerificationQueueJobV1 {
  return parseVerificationQueueJob({
    schemaVersion: VERIFICATION_QUEUE_SCHEMA_VERSION,
    checkRunId: input.checkRunId,
    correlationId: input.correlationId,
  });
}

export function parseVerificationQueueJob(value: unknown): VerificationQueueJobV1 {
  if (!isRecord(value)) throw new Error("Verification queue job must be an object");

  // Reject extra fields so secrets or runner configuration cannot accidentally enter Redis.
  const allowedFields = new Set(["schemaVersion", "checkRunId", "correlationId"]);
  const unexpectedField = Object.keys(value).find((field) => !allowedFields.has(field));
  if (unexpectedField) {
    throw new Error(`Verification queue job contains unexpected field: ${unexpectedField}`);
  }

  if (value.schemaVersion !== VERIFICATION_QUEUE_SCHEMA_VERSION) {
    throw new Error(
      `Verification queue job schemaVersion must be ${VERIFICATION_QUEUE_SCHEMA_VERSION}`,
    );
  }

  return {
    schemaVersion: VERIFICATION_QUEUE_SCHEMA_VERSION,
    checkRunId: readIdentifier(value.checkRunId, "checkRunId"),
    correlationId: readIdentifier(value.correlationId, "correlationId"),
  };
}

export function verificationQueueJobId(checkRunId: string): string {
  return `check-run-${readIdentifier(checkRunId, "checkRunId")}`;
}
