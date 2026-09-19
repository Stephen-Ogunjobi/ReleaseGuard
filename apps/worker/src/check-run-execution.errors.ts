export class CheckRunCorrelationMismatchError extends Error {
  constructor(checkRunId: string) {
    super(`CheckRun ${checkRunId} does not belong to the supplied correlation ID`);
    this.name = "CheckRunCorrelationMismatchError";
  }
}

export class CheckRunStateConflictError extends Error {
  constructor(checkRunId: string, expectedStatus: string) {
    super(`CheckRun ${checkRunId} is no longer in expected status ${expectedStatus}`);
    this.name = "CheckRunStateConflictError";
  }
}
