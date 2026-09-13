import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type {
  QueuedVerificationResponse,
  VerificationRunResultResponse,
} from "@release-guard/contracts";
import {
  ActiveCheckDefinitionWithoutVersionError,
  DomainRecordNotFoundError,
  NoActiveCheckDefinitionsError,
  VerificationRunService,
} from "@release-guard/db";
import { randomUUID } from "node:crypto";
import { DatabaseService } from "../database/database.service.ts";
import { VerificationQueueProducer } from "../queue/verification-queue.producer.ts";
import { mapVerificationRunResult } from "./run-result.mapper.ts";

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);
  private readonly runs: VerificationRunService;

  constructor(
    database: DatabaseService,
    private readonly queue: VerificationQueueProducer,
  ) {
    this.runs = new VerificationRunService(database.client);
  }

  async getResult(runId: string): Promise<VerificationRunResultResponse> {
    try {
      return mapVerificationRunResult(await this.runs.findResultById(runId));
    } catch (error) {
      if (error instanceof DomainRecordNotFoundError) {
        throw new NotFoundException(error.message, { cause: error });
      }
      throw error;
    }
  }

  async createManual(
    projectId: string,
    environmentId: string,
  ): Promise<QueuedVerificationResponse> {
    const correlationId = randomUUID();
    let run;

    try {
      // Resolving this call means the run and all CheckRuns are committed.
      run = await this.runs.createManual({
        projectId,
        environmentId,
        correlationId,
      });
    } catch (error) {
      if (error instanceof DomainRecordNotFoundError) {
        throw new NotFoundException(error.message, { cause: error });
      }
      if (
        error instanceof NoActiveCheckDefinitionsError ||
        error instanceof ActiveCheckDefinitionWithoutVersionError
      ) {
        throw new ConflictException(error.message, { cause: error });
      }
      throw error;
    }

    try {
      await Promise.all(
        run.checkRuns.map((checkRun) =>
          this.queue.enqueue({
            checkRunId: checkRun.id,
            correlationId: run.correlationId,
          }),
        ),
      );
    } catch (error) {
      this.logger.error(
        `Verification ${run.id} was committed but queue dispatch failed`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new ServiceUnavailableException(
        {
          message: "Verification was created but could not be queued",
          verificationRunId: run.id,
          correlationId: run.correlationId,
        },
        { cause: error },
      );
    }

    return {
      id: run.id,
      projectId: run.projectId,
      environmentId: run.environmentId,
      triggerType: "MANUAL",
      status: "QUEUED",
      correlationId: run.correlationId,
      createdAt: run.createdAt.toISOString(),
      checkRuns: run.checkRuns.map((checkRun) => ({
        id: checkRun.id,
        checkVersionId: checkRun.checkVersionId,
        status: "QUEUED",
        createdAt: checkRun.createdAt.toISOString(),
      })),
    };
  }
}
