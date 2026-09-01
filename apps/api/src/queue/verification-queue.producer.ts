import { Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import {
  createVerificationQueueJob,
  verificationQueueJobId,
  VERIFICATION_QUEUE_JOB_NAME,
  VERIFICATION_QUEUE_NAME,
  type CreateVerificationQueueJobInput,
  type VerificationQueueJobV1,
} from "@release-guard/contracts";
import { Queue } from "bullmq";

export interface EnqueuedVerificationJob {
  jobId: string;
}

@Injectable()
export class VerificationQueueProducer implements OnModuleInit {
  private readonly logger = new Logger(VerificationQueueProducer.name);

  constructor(
    @InjectQueue(VERIFICATION_QUEUE_NAME)
    private readonly queue: Queue<
      VerificationQueueJobV1,
      void,
      typeof VERIFICATION_QUEUE_JOB_NAME
    >,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.queue.waitUntilReady();
    this.logger.log(`Connected to Redis queue: ${VERIFICATION_QUEUE_NAME}`);
  }

  async enqueue(input: CreateVerificationQueueJobInput): Promise<EnqueuedVerificationJob> {
    const payload = createVerificationQueueJob(input);
    const jobId = verificationQueueJobId(payload.checkRunId);

    await this.queue.add(VERIFICATION_QUEUE_JOB_NAME, payload, { jobId });
    return { jobId };
  }
}
