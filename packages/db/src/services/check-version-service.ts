import type { DatabaseClient } from "../client.ts";
import type { Prisma, RunnerType } from "../generated/prisma/client.ts";

export interface CreateCheckVersionInput {
  checkDefinitionId: string;
  versionNumber: number;
  runnerType: RunnerType;
  schemaVersion: number;
  configuration: Prisma.InputJsonValue;
}

// This is the only application-facing write path for CheckVersion records.
// Configuration changes create a new version; updates and deletes are intentionally absent.
export class CheckVersionService {
  private readonly database: DatabaseClient;

  constructor(database: DatabaseClient) {
    this.database = database;
  }

  create(input: CreateCheckVersionInput) {
    if (!Number.isSafeInteger(input.versionNumber) || input.versionNumber <= 0) {
      throw new Error("versionNumber must be a positive integer");
    }

    if (!Number.isSafeInteger(input.schemaVersion) || input.schemaVersion <= 0) {
      throw new Error("schemaVersion must be a positive integer");
    }

    return this.database.checkVersion.create({
      data: {
        checkDefinitionId: input.checkDefinitionId,
        versionNumber: input.versionNumber,
        runnerType: input.runnerType,
        schemaVersion: input.schemaVersion,
        configurationJson: input.configuration,
      },
    });
  }

  findById(id: string) {
    return this.database.checkVersion.findUnique({ where: { id } });
  }

  listForDefinition(checkDefinitionId: string) {
    return this.database.checkVersion.findMany({
      where: { checkDefinitionId },
      orderBy: { versionNumber: "asc" },
    });
  }
}
