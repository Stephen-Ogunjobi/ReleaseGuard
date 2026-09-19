import {
  AttemptService,
  AttemptStatus,
  DomainRecordNotFoundError,
  FailureType,
  RunStatus,
  type DatabaseClient,
  type RunStatus as RunStatusValue,
} from "@release-guard/db";
import {
  CheckRunCorrelationMismatchError,
  CheckRunStateConflictError,
} from "./check-run-execution.errors.ts";
import type {
  CheckRunner,
  RunnerExecutionResult,
  RunnerTerminalStatus,
  TrustedExecutionContext,
} from "./check-runner.ts";

const terminalRunStatuses = new Set<RunStatusValue>([
  RunStatus.PASSED,
  RunStatus.FAILED,
  RunStatus.INFRASTRUCTURE_ERROR,
  RunStatus.TIMED_OUT,
  RunStatus.CANCELLED,
]);

const aggregateFailurePrecedence: readonly RunnerTerminalStatus[] = [
  RunStatus.FAILED,
  RunStatus.TIMED_OUT,
  RunStatus.INFRASTRUCTURE_ERROR,
  RunStatus.CANCELLED,
];

export interface CheckRunExecutionOptions {
  attemptTimeoutMs: number;
}

export type ExecuteCheckRunResult =
  | {
      outcome: "IGNORED";
      checkRunId: string;
      status: RunStatusValue;
    }
  | {
      outcome: "COMPLETED";
      checkRunId: string;
      attemptId: string;
      status: RunnerTerminalStatus;
    };

interface ClaimedCheckRun {
  outcome: "CLAIMED";
  checkRunId: string;
  attemptId: string;
  verificationRunId: string;
  context: TrustedExecutionContext;
}

type ClaimResult = ClaimedCheckRun | Extract<ExecuteCheckRunResult, { outcome: "IGNORED" }>;

function aggregateTerminalStatus(
  statuses: readonly RunStatusValue[],
): RunnerTerminalStatus | undefined {
  if (statuses.some((status) => !terminalRunStatuses.has(status))) return undefined;

  for (const status of aggregateFailurePrecedence) {
    if (statuses.includes(status)) return status;
  }
  return RunStatus.PASSED;
}

function runnerFailure(error: unknown): RunnerExecutionResult {
  return {
    status: AttemptStatus.INFRASTRUCTURE_ERROR,
    failureType: FailureType.RUNNER,
    failureMessage: error instanceof Error ? error.message : "Runner failed with a non-Error value",
  };
}

export class CheckRunExecutionService {
  private readonly database: DatabaseClient;
  private readonly runner: CheckRunner;
  private readonly options: CheckRunExecutionOptions;

  constructor(
    database: DatabaseClient,
    runner: CheckRunner,
    options: CheckRunExecutionOptions,
  ) {
    if (!Number.isInteger(options.attemptTimeoutMs) || options.attemptTimeoutMs <= 0) {
      throw new Error("attemptTimeoutMs must be a positive integer");
    }

    this.database = database;
    this.runner = runner;
    this.options = options;
  }

  async executeCheckRun(
    checkRunId: string,
    correlationId: string,
  ): Promise<ExecuteCheckRunResult> {
    const claim = await this.claim(checkRunId, correlationId);
    if (claim.outcome === "IGNORED") return claim;

    const startedAt = new Date();
    await new AttemptService(this.database).transition({
      attemptId: claim.attemptId,
      toStatus: AttemptStatus.RUNNING,
      occurredAt: startedAt,
    });

    let result: RunnerExecutionResult;
    try {
      result = await this.runner.execute(claim.context);
    } catch (error) {
      result = runnerFailure(error);
    }

    const completedAt = new Date();
    await this.persistResult(
      claim,
      result,
      completedAt,
      Math.max(0, completedAt.getTime() - startedAt.getTime()),
    );

    return {
      outcome: "COMPLETED",
      checkRunId: claim.checkRunId,
      attemptId: claim.attemptId,
      status: result.status,
    };
  }

  private async claim(checkRunId: string, correlationId: string): Promise<ClaimResult> {
    return this.database.$transaction(async (transaction) => {
      const checkRun = await transaction.checkRun.findUnique({
        where: { id: checkRunId },
        select: {
          id: true,
          status: true,
          verificationRunId: true,
          verificationRun: {
            select: {
              id: true,
              correlationId: true,
              projectId: true,
              environmentId: true,
              environment: { select: { baseUrl: true } },
            },
          },
          checkVersion: {
            select: {
              id: true,
              checkDefinitionId: true,
              runnerType: true,
              schemaVersion: true,
              configurationJson: true,
            },
          },
        },
      });

      if (!checkRun) throw new DomainRecordNotFoundError("CheckRun", checkRunId);
      if (checkRun.verificationRun.correlationId !== correlationId) {
        throw new CheckRunCorrelationMismatchError(checkRunId);
      }

      if (checkRun.status !== RunStatus.QUEUED) {
        return { outcome: "IGNORED", checkRunId, status: checkRun.status };
      }

      // The status predicate is the claim: concurrent deliveries can read QUEUED,
      // but only one is allowed to change that row and continue in this transaction.
      const claimed = await transaction.checkRun.updateMany({
        where: { id: checkRunId, status: RunStatus.QUEUED },
        data: {
          status: RunStatus.RUNNING,
          startedAt: new Date(),
          completedAt: null,
        },
      });

      if (claimed.count === 0) {
        const current = await transaction.checkRun.findUniqueOrThrow({
          where: { id: checkRunId },
          select: { status: true },
        });
        return { outcome: "IGNORED", checkRunId, status: current.status };
      }

      const latestAttempt = await transaction.attempt.aggregate({
        where: { checkRunId },
        _max: { attemptNumber: true },
      });
      const attemptNumber = (latestAttempt._max.attemptNumber ?? 0) + 1;
      const attempt = await transaction.attempt.create({
        data: { checkRunId, attemptNumber, status: AttemptStatus.PROVISIONING },
        select: { id: true },
      });

      await transaction.verificationRun.updateMany({
        where: { id: checkRun.verificationRunId, status: RunStatus.QUEUED },
        data: {
          status: RunStatus.RUNNING,
          startedAt: new Date(),
          completedAt: null,
        },
      });

      return {
        outcome: "CLAIMED",
        checkRunId,
        attemptId: attempt.id,
        verificationRunId: checkRun.verificationRunId,
        context: {
          checkRunId,
          attemptId: attempt.id,
          attemptNumber,
          verificationRunId: checkRun.verificationRun.id,
          correlationId: checkRun.verificationRun.correlationId,
          projectId: checkRun.verificationRun.projectId,
          environmentId: checkRun.verificationRun.environmentId,
          baseUrl: checkRun.verificationRun.environment.baseUrl,
          checkVersionId: checkRun.checkVersion.id,
          checkDefinitionId: checkRun.checkVersion.checkDefinitionId,
          runnerType: checkRun.checkVersion.runnerType,
          schemaVersion: checkRun.checkVersion.schemaVersion,
          configuration: checkRun.checkVersion.configurationJson,
          timeoutMs: this.options.attemptTimeoutMs,
        },
      };
    });
  }

  private async persistResult(
    claim: ClaimedCheckRun,
    result: RunnerExecutionResult,
    completedAt: Date,
    durationMs: number,
  ): Promise<void> {
    await this.database.$transaction(async (transaction) => {
      // Serializing finalizers on the parent prevents two last-running checks
      // from both observing an unfinished sibling and skipping finalization.
      await transaction.$queryRaw`
        SELECT "id" FROM "VerificationRun"
        WHERE "id" = ${claim.verificationRunId}
        FOR UPDATE
      `;

      await new AttemptService(transaction).transition({
        attemptId: claim.attemptId,
        toStatus: result.status,
        failureType:
          result.status === AttemptStatus.PASSED
            ? null
            : (result.failureType ?? FailureType.UNKNOWN),
        failureMessage:
          result.status === AttemptStatus.PASSED
            ? null
            : (result.failureMessage ?? null),
        durationMs,
        occurredAt: completedAt,
      });

      const updated = await transaction.checkRun.updateMany({
        where: { id: claim.checkRunId, status: RunStatus.RUNNING },
        data: {
          status: result.status,
          completedAt,
        },
      });
      if (updated.count !== 1) {
        throw new CheckRunStateConflictError(claim.checkRunId, RunStatus.RUNNING);
      }

      const checkRuns = await transaction.checkRun.findMany({
        where: { verificationRunId: claim.verificationRunId },
        select: { status: true },
      });
      const aggregateStatus = aggregateTerminalStatus(
        checkRuns.map((checkRun) => checkRun.status),
      );

      if (aggregateStatus) {
        await transaction.verificationRun.updateMany({
          where: {
            id: claim.verificationRunId,
            status: { in: [RunStatus.QUEUED, RunStatus.RUNNING] },
          },
          data: { status: aggregateStatus, completedAt },
        });
      }
    });
  }
}
