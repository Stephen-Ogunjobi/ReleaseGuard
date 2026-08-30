import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, beforeEach, test } from "node:test";
import {
  AttemptService,
  AttemptStatus,
  FailureType,
  RunnerType,
  TerminalAttemptError,
  createDatabaseClient,
  type DatabaseClient,
} from "../src/index.ts";
import { prepareTestDatabase } from "./test-database.ts";

let database: DatabaseClient;

before(async () => {
  database = createDatabaseClient(await prepareTestDatabase());
  await database.$connect();
});

beforeEach(async () => {
  await database.$executeRawUnsafe(
    'TRUNCATE TABLE "Attempt", "CheckRun", "VerificationRun", "CheckVersion", "CheckDefinition", "Environment", "Project" CASCADE',
  );
});

after(async () => {
  if (database) await database.$disconnect();
});

async function createFixture() {
  const suffix = randomUUID();
  const project = await database.project.create({
    data: { name: `Project ${suffix}`, slug: `project-${suffix}` },
  });
  const environment = await database.environment.create({
    data: {
      projectId: project.id,
      name: "production",
      baseUrl: "https://example.test",
    },
  });
  const definition = await database.checkDefinition.create({
    data: {
      projectId: project.id,
      name: "Login",
      runnerType: RunnerType.PLAYWRIGHT_BROWSER,
    },
  });
  const version = await database.checkVersion.create({
    data: {
      checkDefinitionId: definition.id,
      versionNumber: 1,
      runnerType: RunnerType.PLAYWRIGHT_BROWSER,
      schemaVersion: 1,
      configurationJson: { kind: "LOGIN", startPath: "/login" },
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
  const checkRun = await database.checkRun.create({
    data: { verificationRunId: verification.id, checkVersionId: version.id },
  });
  const attempt = await database.attempt.create({
    data: { checkRunId: checkRun.id, attemptNumber: 1 },
  });

  return { project, environment, definition, version, verification, checkRun, attempt };
}

test("CheckVersion records cannot be updated or deleted", async () => {
  const { version } = await createFixture();

  await assert.rejects(
    database.checkVersion.update({
      where: { id: version.id },
      data: { configurationJson: { kind: "CHANGED" } },
    }),
    /CheckVersion records are immutable/,
  );
  await assert.rejects(
    database.checkVersion.delete({ where: { id: version.id } }),
    /CheckVersion records are immutable/,
  );
});

test("a definition cannot contain duplicate version numbers", async () => {
  const { definition } = await createFixture();

  await assert.rejects(
    database.checkVersion.create({
      data: {
        checkDefinitionId: definition.id,
        versionNumber: 1,
        runnerType: RunnerType.PLAYWRIGHT_BROWSER,
        schemaVersion: 1,
        configurationJson: { kind: "LOGIN", startPath: "/login" },
      },
    }),
  );
});

test("every CheckRun requires exactly one CheckVersion", async () => {
  const { verification } = await createFixture();

  await assert.rejects(
    database.$executeRaw`
      INSERT INTO "CheckRun" (
        "id", "verificationRunId", "checkVersionId", "status", "createdAt", "updatedAt"
      ) VALUES (
        ${randomUUID()}, ${verification.id}, NULL, 'QUEUED', NOW(), NOW()
      )
    `,
  );
});

test("a verification cannot contain the same CheckVersion twice", async () => {
  const { verification, version } = await createFixture();

  await assert.rejects(
    database.checkRun.create({
      data: { verificationRunId: verification.id, checkVersionId: version.id },
    }),
  );
});

test("a CheckRun cannot contain duplicate attempt numbers", async () => {
  const { checkRun } = await createFixture();

  await assert.rejects(
    database.attempt.create({
      data: { checkRunId: checkRun.id, attemptNumber: 1 },
    }),
  );
});

test("AttemptService allows valid transitions and preserves terminal attempts", async () => {
  const { attempt } = await createFixture();
  const service = new AttemptService(database);

  const running = await service.transition({
    attemptId: attempt.id,
    toStatus: AttemptStatus.RUNNING,
  });
  assert.equal(running.status, AttemptStatus.RUNNING);
  assert.ok(running.startedAt);

  const failed = await service.transition({
    attemptId: attempt.id,
    toStatus: AttemptStatus.FAILED,
    failureType: FailureType.ASSERTION,
    failureMessage: "Dashboard was not visible",
    durationMs: 125,
  });
  assert.equal(failed.status, AttemptStatus.FAILED);
  assert.ok(failed.completedAt);

  await assert.rejects(
    service.transition({
      attemptId: attempt.id,
      toStatus: AttemptStatus.PASSED,
      durationMs: 200,
    }),
    TerminalAttemptError,
  );

  const preserved = await database.attempt.findUniqueOrThrow({ where: { id: attempt.id } });
  assert.equal(preserved.status, AttemptStatus.FAILED);
  assert.equal(preserved.failureType, FailureType.ASSERTION);
  assert.equal(preserved.failureMessage, "Dashboard was not visible");
  assert.equal(preserved.durationMs, 125);
});

test("AttemptService rejects an invalid direct transition to PASSED", async () => {
  const { attempt } = await createFixture();
  const service = new AttemptService(database);

  await assert.rejects(
    service.transition({ attemptId: attempt.id, toStatus: AttemptStatus.PASSED }),
    /Attempt cannot transition from PROVISIONING to PASSED/,
  );
});
