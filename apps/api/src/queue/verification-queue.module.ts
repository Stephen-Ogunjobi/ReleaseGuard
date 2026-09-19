import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import {
  VERIFICATION_QUEUE_NAME,
  VERIFICATION_QUEUE_PREFIX,
} from "@release-guard/contracts";
import { VerificationQueueProducer } from "./verification-queue.producer.ts";

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configuration: ConfigService) => ({
        connection: {
          host: configuration.getOrThrow<string>("REDIS_HOST"),
          port: configuration.getOrThrow<number>("REDIS_PORT"),
          password: configuration.getOrThrow<string>("REDIS_PASSWORD"),
        },
        prefix: VERIFICATION_QUEUE_PREFIX,
      }),
    }),
    BullModule.registerQueue({ name: VERIFICATION_QUEUE_NAME }),
  ],
  providers: [VerificationQueueProducer],
  exports: [VerificationQueueProducer],
})
export class VerificationQueueModule {}
