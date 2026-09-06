import type {
  AttemptResultResponse,
  CheckRunResultResponse,
  VerificationRunResultResponse,
} from "@release-guard/contracts";
import type { VerificationRunResult } from "@release-guard/db";

function toTimestamp(value: Date | null): string | null {
  return value?.toISOString() ?? null;
}

function completedDurationMs(startedAt: Date | null, completedAt: Date | null): number | null {
  if (!startedAt || !completedAt) return null;
  return Math.max(0, completedAt.getTime() - startedAt.getTime());
}

function mapAttempt(
  attempt: VerificationRunResult["checkRuns"][number]["attempts"][number],
): AttemptResultResponse {
  return {
    id: attempt.id,
    attemptNumber: attempt.attemptNumber,
    status: attempt.status,
    durationMs:
      attempt.durationMs ?? completedDurationMs(attempt.startedAt, attempt.completedAt),
    failureClassification: attempt.failureType,
    failureMessage: attempt.failureMessage,
    createdAt: attempt.createdAt.toISOString(),
    startedAt: toTimestamp(attempt.startedAt),
    completedAt: toTimestamp(attempt.completedAt),
  };
}

function mapCheckRun(
  checkRun: VerificationRunResult["checkRuns"][number],
): CheckRunResultResponse {
  const attempts = checkRun.attempts.map(mapAttempt);
  const latestAttempt = attempts.at(-1);

  return {
    id: checkRun.id,
    selectedCheckVersion: {
      id: checkRun.checkVersion.id,
      checkDefinitionId: checkRun.checkVersion.checkDefinitionId,
      checkDefinitionName: checkRun.checkVersion.checkDefinition.name,
      versionNumber: checkRun.checkVersion.versionNumber,
      runnerType: checkRun.checkVersion.runnerType,
      schemaVersion: checkRun.checkVersion.schemaVersion,
      configuration: checkRun.checkVersion.configurationJson,
      createdAt: checkRun.checkVersion.createdAt.toISOString(),
    },
    result: {
      status: checkRun.status,
      durationMs: completedDurationMs(checkRun.startedAt, checkRun.completedAt),
      // The latest attempt owns the final classification after any retry.
      failureClassification: latestAttempt?.failureClassification ?? null,
      startedAt: toTimestamp(checkRun.startedAt),
      completedAt: toTimestamp(checkRun.completedAt),
    },
    attempts,
  };
}

export function mapVerificationRunResult(
  run: VerificationRunResult,
): VerificationRunResultResponse {
  return {
    id: run.id,
    projectId: run.projectId,
    environmentId: run.environmentId,
    triggerType: run.triggerType,
    status: run.status,
    correlationId: run.correlationId,
    durationMs: completedDurationMs(run.startedAt, run.completedAt),
    createdAt: run.createdAt.toISOString(),
    startedAt: toTimestamp(run.startedAt),
    completedAt: toTimestamp(run.completedAt),
    checkRuns: run.checkRuns.map(mapCheckRun),
  };
}
