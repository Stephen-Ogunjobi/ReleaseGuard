import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createVerificationQueueJob,
  parseVerificationQueueJob,
  verificationQueueJobId,
} from "../src/verification-queue.ts";

test("creates the versioned identifier-only queue payload", () => {
  assert.deepEqual(
    createVerificationQueueJob({
      checkRunId: "check-run-id",
      correlationId: "correlation-id",
    }),
    {
      schemaVersion: 1,
      checkRunId: "check-run-id",
      correlationId: "correlation-id",
    },
  );
});

test("creates a deterministic BullMQ job ID", () => {
  assert.equal(verificationQueueJobId("check-run-id"), "check-run-check-run-id");
});

test("rejects unsupported queue schema versions", () => {
  assert.throws(
    () =>
      parseVerificationQueueJob({
        schemaVersion: 2,
        checkRunId: "check-run-id",
        correlationId: "correlation-id",
      }),
    /schemaVersion must be 1/,
  );
});

test("rejects missing identifiers", () => {
  assert.throws(
    () =>
      parseVerificationQueueJob({
        schemaVersion: 1,
        checkRunId: "",
        correlationId: "correlation-id",
      }),
    /checkRunId must be a non-empty string/,
  );
});

test("rejects extra fields that could leak data into Redis", () => {
  assert.throws(
    () =>
      parseVerificationQueueJob({
        schemaVersion: 1,
        checkRunId: "check-run-id",
        correlationId: "correlation-id",
        password: "must-not-be-queued",
      }),
    /unexpected field: password/,
  );
});
