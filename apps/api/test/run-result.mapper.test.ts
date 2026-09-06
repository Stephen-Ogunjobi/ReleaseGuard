import assert from "node:assert/strict";
import { test } from "node:test";
import type { VerificationRunResult } from "@release-guard/db";
import { mapVerificationRunResult } from "../src/verification/run-result.mapper.ts";

test("maps duration and final failure classification from an ordered attempt history", () => {
  const startedAt = new Date("2026-09-06T10:00:00.000Z");
  const completedAt = new Date("2026-09-06T10:00:03.000Z");
  const run = {
    id: "run-id",
    projectId: "project-id",
    environmentId: "environment-id",
    triggerType: "MANUAL",
    status: "FAILED",
    correlationId: "correlation-id",
    createdAt: startedAt,
    startedAt,
    completedAt,
    updatedAt: completedAt,
    checkRuns: [
      {
        id: "check-run-id",
        verificationRunId: "run-id",
        checkVersionId: "check-version-id",
        status: "FAILED",
        createdAt: startedAt,
        startedAt,
        completedAt,
        updatedAt: completedAt,
        checkVersion: {
          id: "check-version-id",
          checkDefinitionId: "definition-id",
          versionNumber: 2,
          runnerType: "PLAYWRIGHT_BROWSER",
          schemaVersion: 1,
          configurationJson: { kind: "LOGIN", startPath: "/login" },
          createdAt: startedAt,
          checkDefinition: { id: "definition-id", name: "Login" },
        },
        attempts: [
          {
            id: "attempt-1",
            checkRunId: "check-run-id",
            attemptNumber: 1,
            status: "INFRASTRUCTURE_ERROR",
            failureType: "BROWSER",
            failureMessage: null,
            durationMs: 500,
            createdAt: startedAt,
            startedAt,
            completedAt: new Date("2026-09-06T10:00:00.500Z"),
            updatedAt: completedAt,
          },
          {
            id: "attempt-2",
            checkRunId: "check-run-id",
            attemptNumber: 2,
            status: "FAILED",
            failureType: "ASSERTION",
            failureMessage: "Dashboard was not visible",
            durationMs: 1_800,
            createdAt: startedAt,
            startedAt: new Date("2026-09-06T10:00:01.000Z"),
            completedAt,
            updatedAt: completedAt,
          },
        ],
      },
    ],
  } satisfies VerificationRunResult;

  const result = mapVerificationRunResult(run);

  assert.equal(result.durationMs, 3_000);
  assert.equal(result.checkRuns[0]?.selectedCheckVersion.versionNumber, 2);
  assert.equal(result.checkRuns[0]?.result.durationMs, 3_000);
  assert.equal(result.checkRuns[0]?.result.failureClassification, "ASSERTION");
  assert.deepEqual(
    result.checkRuns[0]?.attempts.map((attempt) => attempt.attemptNumber),
    [1, 2],
  );
});
