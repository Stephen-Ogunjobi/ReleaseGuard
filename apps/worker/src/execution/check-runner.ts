import type { FailureType, RunnerType } from "@release-guard/db";

export type RunnerTerminalStatus =
  | "PASSED"
  | "FAILED"
  | "INFRASTRUCTURE_ERROR"
  | "TIMED_OUT"
  | "CANCELLED";

export interface TrustedExecutionContext {
  checkRunId: string;
  attemptId: string;
  attemptNumber: number;
  verificationRunId: string;
  correlationId: string;
  projectId: string;
  environmentId: string;
  baseUrl: string;
  checkVersionId: string;
  checkDefinitionId: string;
  runnerType: RunnerType;
  schemaVersion: number;
  configuration: unknown;
  timeoutMs: number;
}

export interface RunnerExecutionResult {
  status: RunnerTerminalStatus;
  failureType?: FailureType | null;
  failureMessage?: string | null;
}

// The execution service depends on this boundary rather than Playwright. A concrete
// browser runner can be added without moving persistence rules into runner code.
export interface CheckRunner {
  execute(context: TrustedExecutionContext): Promise<RunnerExecutionResult>;
}
