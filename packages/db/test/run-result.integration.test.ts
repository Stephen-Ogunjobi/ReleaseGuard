import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, beforeEach, test } from "node:test";
import {
  DomainRecordNotFoundError,
  FailureType,
  RunnerType,
  VerificationRunService,
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

async function createResultFixture() {
  const suffix = randomUUID();
  const startedAt = new Date("2026-09-06T10:00:00.000Z");
  const completedAt = new Date("2026-09-06T10:00:03.000Z");
  const project = await database.project.create({
    data: { name: `Result ${suffix}`, slug: `result-${suffix}` },
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
      versionNumber: 2,
      runnerType: RunnerType.PLAYWRIGHT_BROWSER,
      schemaVersion: 1,
      configurationJson: { kind: "LOGIN", startPath: "/login" },
    },
  });
  const run = await database.verificationRun.create({
    data: {
      projectId: project.id,
      environmentId: environment.id,
      triggerType: "MANUAL",
      status: "FAILED",
      correlationId: randomUUID(),
      startedAt,
      completedAt,
    },
  });
  const checkRun = await database.checkRun.create({
    data: {
      verificationRunId: run.id,
      checkVersionId: version.id,
      status: "FAILED",
      startedAt,
      completedAt,
    },
  });
  await database.attempt.createMany({
    data: [
      {
        checkRunId: checkRun.id,
        attemptNumber: 2,
        status: "FAILED",
        failureType: FailureType.ASSERTION,
        failureMessage: "Dashboard was not visible",
        durationMs: 1_800,
        startedAt: new Date("2026-09-06T10:00:01.000Z"),
        completedAt,
      },
      {
        checkRunId: checkRun.id,
        attemptNumber: 1,
        status: "INFRASTRUCTURE_ERROR",
        failureType: FailureType.BROWSER,
        durationMs: 500,
        startedAt,
        completedAt: new Date("2026-09-06T10:00:00.500Z"),
      },
    ],
  });

  return { run, version };
}

test("run result loads the selected version and attempts in execution order", async () => {
  const { run, version } = await createResultFixture();
  const service = new VerificationRunService(database);

  const result = await service.findResultById(run.id);

  assert.equal(result.checkRuns.length, 1);
  assert.equal(result.checkRuns[0]?.checkVersion.id, version.id);
  assert.equal(result.checkRuns[0]?.checkVersion.versionNumber, 2);
  assert.equal(result.checkRuns[0]?.checkVersion.checkDefinition.name, "Login");
  assert.deepEqual(
    result.checkRuns[0]?.attempts.map((attempt) => attempt.attemptNumber),
    [1, 2],
  );
  assert.equal(result.checkRuns[0]?.attempts[1]?.failureType, FailureType.ASSERTION);
});

test("run result rejects an unknown verification run", async () => {
  const service = new VerificationRunService(database);
  await assert.rejects(service.findResultById("missing-run"), DomainRecordNotFoundError);
});
