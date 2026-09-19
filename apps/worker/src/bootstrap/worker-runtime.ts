import type { WorkerEnvironment } from "@release-guard/config";
import {
  VERIFICATION_QUEUE_NAME,
  VERIFICATION_QUEUE_PREFIX,
} from "@release-guard/contracts";
import {
  createDatabaseClient,
  type DatabaseClient,
} from "@release-guard/db";
import { Worker } from "bullmq";
import {
  createVerificationJobProcessor,
  type VerificationJobHandler,
} from "../queue/verification-job.processor.ts";

export interface WorkerRuntime {
  database: DatabaseClient;
  queueWorker: Worker<unknown, void, string>;
  close(): Promise<void>;
}

export interface ShutdownSignalSource {
  once(signal: "SIGINT" | "SIGTERM", listener: () => void): unknown;
}

export async function createWorkerRuntime(
  environment: WorkerEnvironment,
  handler: VerificationJobHandler,
): Promise<WorkerRuntime> {
  const database = createDatabaseClient(environment.databaseUrl);
  await database.$connect();

  let queueWorker: Worker<unknown, void, string> | undefined;

  try {
    queueWorker = new Worker<unknown, void, string>(
      VERIFICATION_QUEUE_NAME,
      createVerificationJobProcessor(handler, environment.attemptTimeoutMs),
      {
        connection: {
          host: environment.redis.host,
          port: environment.redis.port,
          password: environment.redis.password,
          maxRetriesPerRequest: null,
        },
        concurrency: environment.concurrency,
        name: "verification-worker",
        prefix: VERIFICATION_QUEUE_PREFIX,
      },
    );

    queueWorker.on("error", (error) => {
      console.error("Verification queue worker error", error);
    });
    await queueWorker.waitUntilReady();
  } catch (error) {
    if (queueWorker) await queueWorker.close().catch(() => undefined);
    await database.$disconnect();
    throw error;
  }

  let closePromise: Promise<void> | undefined;
  return {
    database,
    queueWorker,
    close() {
      closePromise ??= (async () => {
        try {
          // BullMQ stops accepting work and waits for active jobs before closing Redis.
          await queueWorker.close();
        } finally {
          await database.$disconnect();
        }
      })();
      return closePromise;
    },
  };
}

export function registerShutdownSignals(
  runtime: Pick<WorkerRuntime, "close">,
  source: ShutdownSignalSource = process,
): void {
  const shutdown = (signal: "SIGINT" | "SIGTERM") => {
    console.log(`${signal} received; shutting down worker`);
    void runtime
      .close()
      .then(() => console.log("Worker resources closed"))
      .catch((error: unknown) => {
        console.error("Worker shutdown failed", error);
        process.exitCode = 1;
      });
  };

  source.once("SIGINT", () => shutdown("SIGINT"));
  source.once("SIGTERM", () => shutdown("SIGTERM"));
}
