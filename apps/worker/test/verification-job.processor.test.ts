import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createVerificationJobProcessor,
  UnknownVerificationJobNameError,
  type VerificationJobHandler,
} from "../src/queue/verification-job.processor.ts";

test("valid jobs are parsed before domain work receives them", async () => {
  const received: unknown[] = [];
  const handler: VerificationJobHandler = async (payload, context) => {
    received.push({ payload, context });
  };
  const processJob = createVerificationJobProcessor(handler, 120_000);

  await processJob({
    name: "execute-check-run",
    data: {
      schemaVersion: 1,
      checkRunId: "check-run-id",
      correlationId: "correlation-id",
    },
  });

  assert.deepEqual(received, [
    {
      payload: {
        schemaVersion: 1,
        checkRunId: "check-run-id",
        correlationId: "correlation-id",
      },
      context: { attemptTimeoutMs: 120_000 },
    },
  ]);
});

test("invalid payloads fail before domain work runs", async () => {
  let domainCalls = 0;
  const processJob = createVerificationJobProcessor(async () => {
    domainCalls += 1;
  }, 120_000);

  await assert.rejects(
    processJob({
      name: "execute-check-run",
      data: {
        schemaVersion: 1,
        checkRunId: "",
        correlationId: "correlation-id",
      },
    }),
    /checkRunId must be a non-empty string/,
  );
  assert.equal(domainCalls, 0);
});

test("unknown job names fail before domain work runs", async () => {
  let domainCalls = 0;
  const processJob = createVerificationJobProcessor(async () => {
    domainCalls += 1;
  }, 120_000);

  await assert.rejects(
    processJob({ name: "unknown-job", data: {} }),
    UnknownVerificationJobNameError,
  );
  assert.equal(domainCalls, 0);
});
