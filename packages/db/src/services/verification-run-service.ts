import type { DatabaseClient } from "../client.ts";
import {
  VerificationTriggerType,
  type Prisma,
} from "../generated/prisma/client.ts";
import {
  ActiveCheckDefinitionWithoutVersionError,
  DomainRecordNotFoundError,
  NoActiveCheckDefinitionsError,
} from "../errors.ts";

const manualVerificationInclude = {
  checkRuns: true,
} satisfies Prisma.VerificationRunInclude;

const verificationResultInclude = {
  checkRuns: {
    orderBy: { createdAt: "asc" },
    include: {
      checkVersion: {
        include: {
          checkDefinition: {
            select: { id: true, name: true },
          },
        },
      },
      attempts: {
        orderBy: { attemptNumber: "asc" },
      },
    },
  },
} satisfies Prisma.VerificationRunInclude;

export type ManualVerificationRun = Prisma.VerificationRunGetPayload<{
  include: typeof manualVerificationInclude;
}>;

export type VerificationRunResult = Prisma.VerificationRunGetPayload<{
  include: typeof verificationResultInclude;
}>;

export interface CreateManualVerificationInput {
  projectId: string;
  environmentId: string;
  correlationId: string;
}

export class VerificationRunService {
  private readonly database: DatabaseClient;

  constructor(database: DatabaseClient) {
    this.database = database;
  }

  async findResultById(runId: string): Promise<VerificationRunResult> {
    const run = await this.database.verificationRun.findUnique({
      where: { id: runId },
      include: verificationResultInclude,
    });

    if (!run) throw new DomainRecordNotFoundError("VerificationRun", runId);
    return run;
  }

  // establishes one authoritative operation for creating manual verification
  // preventing the API from performing scattered writes.
  async createManual(
    input: CreateManualVerificationInput,
  ): Promise<ManualVerificationRun> {
    if (input.correlationId.trim() === "") {
      throw new Error("correlationId must not be empty");
    }

    return this.database.$transaction(async (transaction) => {
      const project = await transaction.project.findUnique({
        where: { id: input.projectId },
        select: { id: true },
      });
      if (!project)
        throw new DomainRecordNotFoundError("Project", input.projectId);

      // Filtering by both IDs proves that the environment belongs to this project.
      const environment = await transaction.environment.findFirst({
        where: { id: input.environmentId, projectId: input.projectId },
        select: { id: true },
      });
      if (!environment) {
        throw new DomainRecordNotFoundError("Environment", input.environmentId);
      }

      const activeDefinitions = await transaction.checkDefinition.findMany({
        where: { projectId: input.projectId, isActive: true },
        select: {
          id: true,
          // CheckVersions are immutable, so the greatest version number is current.
          versions: {
            orderBy: { versionNumber: "desc" },
            take: 1,
            select: { id: true },
          },
        },
      });

      if (activeDefinitions.length === 0) {
        throw new NoActiveCheckDefinitionsError(input.projectId);
      }

      const missingVersion = activeDefinitions.find(
        (definition) => definition.versions.length === 0,
      );
      if (missingVersion) {
        throw new ActiveCheckDefinitionWithoutVersionError(missingVersion.id);
      }

      const currentVersionIds = activeDefinitions.map(
        (definition) => definition.versions[0]!.id,
      );

      // Nested creation makes the run and its version snapshot one atomic database write.
      return transaction.verificationRun.create({
        data: {
          projectId: project.id,
          environmentId: environment.id,
          triggerType: VerificationTriggerType.MANUAL,
          correlationId: input.correlationId,
          checkRuns: {
            create: currentVersionIds.map((checkVersionId) => ({
              checkVersionId,
            })),
          },
        },
        include: manualVerificationInclude,
      });
    });
  }
}
