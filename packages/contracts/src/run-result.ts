export type RunResultStatus =
  | "QUEUED"
  | "RUNNING"
  | "PASSED"
  | "FAILED"
  | "INFRASTRUCTURE_ERROR"
  | "TIMED_OUT"
  | "CANCELLED";

export type AttemptResultStatus =
  | "PROVISIONING"
  | "RUNNING"
  | "PASSED"
  | "FAILED"
  | "INFRASTRUCTURE_ERROR"
  | "TIMED_OUT"
  | "CANCELLED";

export type FailureClassification =
  | "ASSERTION"
  | "APPLICATION_NETWORK"
  | "TARGET_UNAVAILABLE"
  | "BROWSER"
  | "RUNNER"
  | "SECRET_RESOLUTION"
  | "UNKNOWN";

export interface SelectedCheckVersionResponse {
  id: string;
  checkDefinitionId: string;
  checkDefinitionName: string;
  versionNumber: number;
  runnerType: "PLAYWRIGHT_BROWSER";
  schemaVersion: number;
  configuration: unknown;
  createdAt: string;
}

export interface AttemptResultResponse {
  id: string;
  attemptNumber: number;
  status: AttemptResultStatus;
  durationMs: number | null;
  failureClassification: FailureClassification | null;
  failureMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface CheckResultResponse {
  status: RunResultStatus;
  durationMs: number | null;
  failureClassification: FailureClassification | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface CheckRunResultResponse {
  id: string;
  selectedCheckVersion: SelectedCheckVersionResponse;
  result: CheckResultResponse;
  attempts: readonly AttemptResultResponse[];
}

export interface VerificationRunResultResponse {
  id: string;
  projectId: string;
  environmentId: string;
  triggerType: "MANUAL" | "MANUAL_RERUN" | "DEPLOYMENT";
  status: RunResultStatus;
  correlationId: string;
  durationMs: number | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  checkRuns: readonly CheckRunResultResponse[];
}
