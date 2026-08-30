import type { DatabaseClient } from "../client.ts";
import {
  AttemptStatus,
  type Attempt,
  type FailureType,
  type Prisma,
} from "../generated/prisma/client.ts";
import {
  DomainRecordNotFoundError,
  InvalidAttemptTransitionError,
  TerminalAttemptError,
} from "../errors.ts";

const terminalStatuses = new Set<Attempt["status"]>([
  AttemptStatus.PASSED,
  AttemptStatus.FAILED,
  AttemptStatus.INFRASTRUCTURE_ERROR,
  AttemptStatus.TIMED_OUT,
  AttemptStatus.CANCELLED,
]);

// Each target status lists the states from which it can be reached.
// PROVISIONING is assigned only when an Attempt is created, never by transition.
const allowedSources: Record<Attempt["status"], readonly Attempt["status"][]> = {
  PROVISIONING: [],
  RUNNING: [AttemptStatus.PROVISIONING],
  PASSED: [AttemptStatus.RUNNING],
  FAILED: [AttemptStatus.RUNNING],
  INFRASTRUCTURE_ERROR: [AttemptStatus.PROVISIONING, AttemptStatus.RUNNING],
  TIMED_OUT: [AttemptStatus.PROVISIONING, AttemptStatus.RUNNING],
  CANCELLED: [AttemptStatus.PROVISIONING, AttemptStatus.RUNNING],
};

export interface TransitionAttemptInput {
  attemptId: string;
  toStatus: Attempt["status"];
  failureType?: FailureType | null;
  failureMessage?: string | null;
  durationMs?: number | null;
  occurredAt?: Date;
}

// Centralizes worker-owned Attempt transitions so API and worker code cannot
// accidentally rewrite terminal execution history through application services.
export class AttemptService {
  private readonly database: DatabaseClient;

  constructor(database: DatabaseClient) {
    this.database = database;
  }

  async transition(input: TransitionAttemptInput): Promise<Attempt> {
    const sources = allowedSources[input.toStatus];
    if (sources.length === 0) {
      throw new InvalidAttemptTransitionError("any state", input.toStatus);
    }

    if (input.durationMs !== undefined && input.durationMs !== null && input.durationMs < 0) {
      throw new Error("durationMs must not be negative");
    }

    const occurredAt = input.occurredAt ?? new Date();
    const data: Prisma.AttemptUpdateManyMutationInput = {
      status: input.toStatus,
    };

    if (input.toStatus === AttemptStatus.RUNNING) {
      data.startedAt = occurredAt;
    }

    if (terminalStatuses.has(input.toStatus)) {
      data.completedAt = occurredAt;
      if (input.failureType !== undefined) data.failureType = input.failureType;
      if (input.failureMessage !== undefined) data.failureMessage = input.failureMessage;
      if (input.durationMs !== undefined) data.durationMs = input.durationMs;
    }

    // Filtering by the current status makes the transition atomic: if another
    // worker changed the Attempt first, this update affects zero rows.
    const result = await this.database.attempt.updateMany({
      where: {
        id: input.attemptId,
        status: { in: [...sources] },
      },
      data,
    });

    if (result.count === 1) {
      const updated = await this.database.attempt.findUnique({ where: { id: input.attemptId } });
      if (updated) return updated;
    }

    const current = await this.database.attempt.findUnique({ where: { id: input.attemptId } });
    if (!current) throw new DomainRecordNotFoundError("Attempt", input.attemptId);
    if (terminalStatuses.has(current.status)) {
      throw new TerminalAttemptError(current.id, current.status);
    }
    throw new InvalidAttemptTransitionError(current.status, input.toStatus);
  }
}
