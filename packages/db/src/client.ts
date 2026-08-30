import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.ts";

export type DatabaseClient = PrismaClient;

// Builds the typed Prisma client used by long-running API or worker processes.
// The caller owns its lifetime and must call $disconnect() during shutdown.
export function createDatabaseClient(databaseUrl: string): DatabaseClient {
  let url: URL;

  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL connection URL");
  }

  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    throw new Error("DATABASE_URL must use the postgresql:// or postgres:// protocol");
  }

  const adapter = new PrismaPg({ connectionString: databaseUrl });
  return new PrismaClient({ adapter });
}
