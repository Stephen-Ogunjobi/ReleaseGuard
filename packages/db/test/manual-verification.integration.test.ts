import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, beforeEach, test } from "node:test";
import {
  ActiveCheckDefinitionWithoutVersionError,
  DomainRecordNotFoundError,
  NoActiveCheckDefinitionsError,
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

async function createProject(name: string) {
  const suffix = randomUUID();
  const project = await database.project.create({
    data: { name, slug: `${name.toLowerCase()}-${suffix}` },
  });
  const environment = await database.environment.create({
    data: {
      projectId: project.id,
      name: "production",
      baseUrl: "https://example.test",
    },
  });
  return { project, environment };
}

async function createDefinition(projectId: string, name: string, isActive = true) {
  return database.checkDefinition.create({
    data: {
      projectId,
      name,
      runnerType: RunnerType.PLAYWRIGHT_BROWSER,
      isActive,
    },
  });
}

async function createVersion(checkDefinitionId: string, versionNumber: number) {
  return database.checkVersion.create({
    data: {
      checkDefinitionId,
      versionNumber,
      runnerType: RunnerType.PLAYWRIGHT_BROWSER,
      schemaVersion: 1,
      configurationJson: { kind: "LOGIN", startPath: "/login" },
    },
  });
}

test("manual verification snapshots the latest version of every active check", async () => {
  const { project, environment } = await createProject("ReleaseGuard");
  const login = await createDefinition(project.id, "Login");
  const health = await createDefinition(project.id, "Health");
  const inactive = await createDefinition(project.id, "Inactive", false);

  await createVersion(login.id, 1);
  const loginCurrent = await createVersion(login.id, 2);
  const healthCurrent = await createVersion(health.id, 1);
  await createVersion(inactive.id, 1);

  const service = new VerificationRunService(database);
  const run = await service.createManual({
    projectId: project.id,
    environmentId: environment.id,
    correlationId: randomUUID(),
  });

  assert.equal(run.triggerType, "MANUAL");
  assert.equal(run.status, "QUEUED");
  assert.equal(run.checkRuns.length, 2);
  assert.deepEqual(
    new Set(run.checkRuns.map((checkRun) => checkRun.checkVersionId)),
    new Set([loginCurrent.id, healthCurrent.id]),
  );
  assert.ok(run.checkRuns.every((checkRun) => checkRun.status === "QUEUED"));
});

test("manual verification rejects an environment from another project", async () => {
  const first = await createProject("First");
  const second = await createProject("Second");
  const definition = await createDefinition(first.project.id, "Login");
  await createVersion(definition.id, 1);

  const service = new VerificationRunService(database);
  await assert.rejects(
    service.createManual({
      projectId: first.project.id,
      environmentId: second.environment.id,
      correlationId: randomUUID(),
    }),
    DomainRecordNotFoundError,
  );

  assert.equal(await database.verificationRun.count(), 0);
  assert.equal(await database.checkRun.count(), 0);
});

test("manual verification rejects an unknown project", async () => {
  const { environment } = await createProject("Existing");
  const service = new VerificationRunService(database);

  await assert.rejects(
    service.createManual({
      projectId: "missing-project",
      environmentId: environment.id,
      correlationId: randomUUID(),
    }),
    DomainRecordNotFoundError,
  );

  assert.equal(await database.verificationRun.count(), 0);
});

test("manual verification rejects a project with no active checks", async () => {
  const { project, environment } = await createProject("NoChecks");
  const service = new VerificationRunService(database);

  await assert.rejects(
    service.createManual({
      projectId: project.id,
      environmentId: environment.id,
      correlationId: randomUUID(),
    }),
    NoActiveCheckDefinitionsError,
  );

  assert.equal(await database.verificationRun.count(), 0);
});

test("manual verification rejects an active check without a version atomically", async () => {
  const { project, environment } = await createProject("MissingVersion");
  const validDefinition = await createDefinition(project.id, "Login");
  await createVersion(validDefinition.id, 1);
  await createDefinition(project.id, "Unconfigured");

  const service = new VerificationRunService(database);
  await assert.rejects(
    service.createManual({
      projectId: project.id,
      environmentId: environment.id,
      correlationId: randomUUID(),
    }),
    ActiveCheckDefinitionWithoutVersionError,
  );

  assert.equal(await database.verificationRun.count(), 0);
  assert.equal(await database.checkRun.count(), 0);
});
