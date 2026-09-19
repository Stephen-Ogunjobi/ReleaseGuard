import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, beforeEach, test } from "node:test";
import {
  AttemptStatus,
  DomainRecordNotFoundError,
  FailureType,
  RunnerType,
  RunStatus,
  createDatabaseClient,
  type DatabaseClient,
} from "@release-guard/db";
import { CheckRunExecutionService } from "../../src/execution/check-run-execution.service.ts";
import { CheckRunCorrelationMismatchError } from "../../src/execution/check-run-execution.errors.ts";
import type {
  CheckRunner,
  RunnerExecutionResult,
  TrustedExecutionContext,
} from "../../src/execution/check-runner.ts";
import { prepareWorkerTestDatabase } from "./test-database.ts";

let database: DatabaseClient;

before(async () => {
  database = createDatabaseClient(await prepareWorkerTestDatabase());
  await database.$connect();
});

beforeEach(async () => {
  await database.$executeRawUnsafe(
    'DROP TRIGGER IF EXISTS "reject_worker_test_attempt" ON "Attempt"',
  );
  await database.$executeRawUnsafe(
    'DROP FUNCTION IF EXISTS "reject_worker_test_attempt_insert"()',
  );
  await database.$executeRawUnsafe(
    'TRUNCATE TABLE "Attempt", "CheckRun", "VerificationRun", "CheckVersion", "CheckDefinition", "Environment", "Project" CASCADE',
  );
});

after(async () => {
  if (database) await database.$disconnect();
});

async function createFixture(checkCount = 1) {
  const suffix = randomUUID();
  const project = await database.project.create({
    data: { name: `Project ${suffix}`, slug: `project-${suffix}` },
  });
  const environment = await database.environment.create({
    data: {
      projectId: project.id,
      name: "production",
      baseUrl: "https://trusted.example.test",
    },
  });
  const verification = await database.verificationRun.create({
    data: {
      projectId: project.id,
      environmentId: environment.id,
      triggerType: "MANUAL",
      correlationId: randomUUID(),
    },
  });

  const checkRuns = [];
  for (let index = 0; index < checkCount; index += 1) {
    const definition = await database.checkDefinition.create({
      data: {
        projectId: project.id,
        name: `Check ${index + 1}`,
        runnerType: RunnerType.PLAYWRIGHT_BROWSER,
      },
    });
    const version = await database.checkVersion.create({
      data: {
        checkDefinitionId: definition.id,
        versionNumber: 1,
        runnerType: RunnerType.PLAYWRIGHT_BROWSER,
        schemaVersion: 1,
        configurationJson: { kind: "LOGIN", startPath: `/login-${index + 1}` },
      },
    });
    const checkRun = await database.checkRun.create({
      data: { verificationRunId: verification.id, checkVersionId: version.id },
    });
    checkRuns.push({ checkRun, definition, version });
  }

  return { project, environment, verification, checkRuns };
}

function createService(runner: CheckRunner): CheckRunExecutionService {
  return new CheckRunExecutionService(database, runner, { attemptTimeoutMs: 120_000 });
}

test("claims a queued check, uses trusted context, and persists its result", async () => {
  const fixture = await createFixture();
  const target = fixture.checkRuns[0]!;
  let receivedContext: TrustedExecutionContext | undefined;

  const service = createService({
    async execute(context) {
      receivedContext = context;
      const [checkRun, attempt, verification] = await Promise.all([
        database.checkRun.findUniqueOrThrow({ where: { id: context.checkRunId } }),
        database.attempt.findUniqueOrThrow({ where: { id: context.attemptId } }),
        database.verificationRun.findUniqueOrThrow({
          where: { id: context.verificationRunId },
        }),
      ]);
      assert.equal(checkRun.status, RunStatus.RUNNING);
      assert.equal(attempt.status, AttemptStatus.RUNNING);
      assert.equal(verification.status, RunStatus.RUNNING);
      return { status: AttemptStatus.PASSED };
    },
  });

  const result = await service.executeCheckRun(
    target.checkRun.id,
    fixture.verification.correlationId,
  );

  assert.equal(result.outcome, "COMPLETED");
  assert.equal(result.status, RunStatus.PASSED);
  assert.equal(receivedContext?.baseUrl, fixture.environment.baseUrl);
  assert.equal(receivedContext?.checkVersionId, target.version.id);
  assert.equal(receivedContext?.attemptNumber, 1);
  assert.equal(receivedContext?.timeoutMs, 120_000);
  assert.deepEqual(receivedContext?.configuration, {
    kind: "LOGIN",
    startPath: "/login-1",
  });

  const attempt = await database.attempt.findUniqueOrThrow({
    where: { id: result.attemptId },
  });
  const checkRun = await database.checkRun.findUniqueOrThrow({
    where: { id: target.checkRun.id },
  });
  const verification = await database.verificationRun.findUniqueOrThrow({
    where: { id: fixture.verification.id },
  });
  assert.equal(attempt.status, AttemptStatus.PASSED);
  assert.equal(attempt.attemptNumber, 1);
  assert.ok(attempt.startedAt);
  assert.ok(attempt.completedAt);
  assert.equal(checkRun.status, RunStatus.PASSED);
  assert.equal(verification.status, RunStatus.PASSED);
  assert.ok(verification.completedAt);
});

test("concurrent duplicate delivery creates only one attempt", async () => {
  const fixture = await createFixture();
  const target = fixture.checkRuns[0]!;
  let releaseRunner!: () => void;
  let announceRunner!: () => void;
  const runnerEntered = new Promise<void>((resolve) => {
    announceRunner = resolve;
  });
  const runnerReleased = new Promise<void>((resolve) => {
    releaseRunner = resolve;
  });
  let runnerCalls = 0;
  const service = createService({
    async execute() {
      runnerCalls += 1;
      announceRunner();
      await runnerReleased;
      return { status: AttemptStatus.PASSED };
    },
  });

  const first = service.executeCheckRun(
    target.checkRun.id,
    fixture.verification.correlationId,
  );
  await runnerEntered;
  const duplicate = await service.executeCheckRun(
    target.checkRun.id,
    fixture.verification.correlationId,
  );

  assert.deepEqual(duplicate, {
    outcome: "IGNORED",
    checkRunId: target.checkRun.id,
    status: RunStatus.RUNNING,
  });
  assert.equal(await database.attempt.count({ where: { checkRunId: target.checkRun.id } }), 1);

  releaseRunner();
  await first;
  const terminalDuplicate = await service.executeCheckRun(
    target.checkRun.id,
    fixture.verification.correlationId,
  );
  assert.equal(terminalDuplicate.outcome, "IGNORED");
  assert.equal(terminalDuplicate.status, RunStatus.PASSED);
  assert.equal(runnerCalls, 1);
  assert.equal(await database.attempt.count({ where: { checkRunId: target.checkRun.id } }), 1);
});

test("a missing check and mismatched correlation produce controlled errors", async () => {
  const fixture = await createFixture();
  const service = createService({
    async execute() {
      return { status: AttemptStatus.PASSED };
    },
  });

  await assert.rejects(
    service.executeCheckRun("missing-check-run", fixture.verification.correlationId),
    DomainRecordNotFoundError,
  );
  await assert.rejects(
    service.executeCheckRun(fixture.checkRuns[0]!.checkRun.id, "wrong-correlation"),
    CheckRunCorrelationMismatchError,
  );
  assert.equal(await database.attempt.count(), 0);
});

test("a terminal check is ignored without invoking the runner", async () => {
  const fixture = await createFixture();
  const target = fixture.checkRuns[0]!;
  await database.checkRun.update({
    where: { id: target.checkRun.id },
    data: { status: RunStatus.CANCELLED, completedAt: new Date() },
  });
  let runnerCalls = 0;
  const service = createService({
    async execute() {
      runnerCalls += 1;
      return { status: AttemptStatus.PASSED };
    },
  });

  const result = await service.executeCheckRun(
    target.checkRun.id,
    fixture.verification.correlationId,
  );
  assert.equal(result.outcome, "IGNORED");
  assert.equal(result.status, RunStatus.CANCELLED);
  assert.equal(runnerCalls, 0);
  assert.equal(await database.attempt.count(), 0);
});

test("claim and attempt creation roll back together", async () => {
  const fixture = await createFixture();
  const target = fixture.checkRuns[0]!;
  await database.$executeRawUnsafe(`
    CREATE FUNCTION "reject_worker_test_attempt_insert"() RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION 'forced attempt insert failure';
    END;
    $$ LANGUAGE plpgsql
  `);
  await database.$executeRawUnsafe(`
    CREATE TRIGGER "reject_worker_test_attempt"
    BEFORE INSERT ON "Attempt"
    FOR EACH ROW EXECUTE FUNCTION "reject_worker_test_attempt_insert"()
  `);
  const service = createService({
    async execute() {
      return { status: AttemptStatus.PASSED };
    },
  });

  await assert.rejects(
    service.executeCheckRun(target.checkRun.id, fixture.verification.correlationId),
    /forced attempt insert failure/,
  );

  const checkRun = await database.checkRun.findUniqueOrThrow({
    where: { id: target.checkRun.id },
  });
  const verification = await database.verificationRun.findUniqueOrThrow({
    where: { id: fixture.verification.id },
  });
  assert.equal(checkRun.status, RunStatus.QUEUED);
  assert.equal(verification.status, RunStatus.QUEUED);
  assert.equal(await database.attempt.count(), 0);
});

test("attempt numbering continues safely for a re-queued check", async () => {
  const fixture = await createFixture();
  const target = fixture.checkRuns[0]!;
  await database.attempt.create({
    data: {
      checkRunId: target.checkRun.id,
      attemptNumber: 1,
      status: AttemptStatus.INFRASTRUCTURE_ERROR,
      completedAt: new Date(),
    },
  });
  const service = createService({
    async execute() {
      return { status: AttemptStatus.PASSED };
    },
  });

  const result = await service.executeCheckRun(
    target.checkRun.id,
    fixture.verification.correlationId,
  );
  assert.equal(result.outcome, "COMPLETED");
  const attempts = await database.attempt.findMany({
    where: { checkRunId: target.checkRun.id },
    orderBy: { attemptNumber: "asc" },
  });
  assert.deepEqual(
    attempts.map((attempt) => attempt.attemptNumber),
    [1, 2],
  );
});

test("runner failures are persisted and sibling completion finalizes the aggregate", async () => {
  const fixture = await createFixture(2);
  let arrivals = 0;
  let releaseBoth!: () => void;
  const bothArrived = new Promise<void>((resolve) => {
    releaseBoth = resolve;
  });
  const runner: CheckRunner = {
    async execute(context): Promise<RunnerExecutionResult> {
      arrivals += 1;
      if (arrivals === 2) releaseBoth();
      await bothArrived;
      if (context.checkRunId === fixture.checkRuns[1]!.checkRun.id) {
        throw new Error("browser process crashed");
      }
      return { status: AttemptStatus.PASSED };
    },
  };
  const service = createService(runner);

  await Promise.all(
    fixture.checkRuns.map(({ checkRun }) =>
      service.executeCheckRun(checkRun.id, fixture.verification.correlationId),
    ),
  );

  const verification = await database.verificationRun.findUniqueOrThrow({
    where: { id: fixture.verification.id },
  });
  const failedAttempt = await database.attempt.findFirstOrThrow({
    where: { checkRunId: fixture.checkRuns[1]!.checkRun.id },
  });
  assert.equal(verification.status, RunStatus.INFRASTRUCTURE_ERROR);
  assert.ok(verification.completedAt);
  assert.equal(failedAttempt.status, AttemptStatus.INFRASTRUCTURE_ERROR);
  assert.equal(failedAttempt.failureType, FailureType.RUNNER);
  assert.equal(failedAttempt.failureMessage, "browser process crashed");
});
