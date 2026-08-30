import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import pg from "pg";

const packageDirectory = fileURLToPath(new URL("../", import.meta.url));
const rootEnvironmentFile = fileURLToPath(new URL("../../../.env", import.meta.url));

config({ path: rootEnvironmentFile, quiet: true });

export function getTestDatabaseUrl(): string {
  const configuredUrl = process.env.DATABASE_URL;
  if (!configuredUrl) throw new Error("DATABASE_URL is required to prepare integration tests");

  const url = new URL(configuredUrl);
  const sourceDatabase = url.pathname.slice(1);
  if (!sourceDatabase) throw new Error("DATABASE_URL must include a database name");

  url.pathname = `/${sourceDatabase}_test`;
  return url.toString();
}

// Integration tests use a separate *_test database because they truncate tables
// between cases and must never touch the developer's ReleaseGuard data.
export async function prepareTestDatabase(): Promise<string> {
  const testDatabaseUrl = getTestDatabaseUrl();
  const testUrl = new URL(testDatabaseUrl);
  const databaseName = testUrl.pathname.slice(1);

  if (!databaseName.endsWith("_test") || !/^[a-zA-Z0-9_]+$/.test(databaseName)) {
    throw new Error("Integration tests require a safe database name ending in _test");
  }

  const adminUrl = new URL(testDatabaseUrl);
  adminUrl.pathname = "/postgres";
  const admin = new pg.Client({ connectionString: adminUrl.toString() });
  await admin.connect();

  try {
    const existing = await admin.query<{ exists: boolean }>(
      "SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1) AS exists",
      [databaseName],
    );
    if (!existing.rows[0]?.exists) {
      await admin.query(`CREATE DATABASE "${databaseName}"`);
    }
  } finally {
    await admin.end();
  }

  await new Promise<void>((resolve, reject) => {
    const migration = spawn("corepack", ["pnpm", "exec", "prisma", "migrate", "deploy"], {
      cwd: packageDirectory,
      env: { ...process.env, DATABASE_URL: testDatabaseUrl },
      stdio: "inherit",
    });
    migration.once("error", reject);
    migration.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Test database migration failed with exit code ${code}`));
    });
  });

  return testDatabaseUrl;
}
