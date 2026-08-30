import {
  Injectable,
  Logger,
  type OnApplicationShutdown,
  type OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createDatabaseClient, type DatabaseClient } from "@release-guard/db";

@Injectable()
export class DatabaseService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(DatabaseService.name);
  readonly client: DatabaseClient;

  constructor(configuration: ConfigService) {
    this.client = createDatabaseClient(configuration.getOrThrow<string>("DATABASE_URL"));
  }

  // Failing here prevents Nest from accepting HTTP traffic without its source of truth.
  async onModuleInit(): Promise<void> {
    await this.client.$connect();
    this.logger.log("Connected to PostgreSQL");
  }

  async onApplicationShutdown(): Promise<void> {
    await this.client.$disconnect();
    this.logger.log("Disconnected from PostgreSQL");
  }
}
