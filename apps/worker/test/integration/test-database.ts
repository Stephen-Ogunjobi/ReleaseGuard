import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import pg from "pg";

const databasePackageDirectory = fileURLToPath(
  new URL("../../../../packages/db/", import.meta.url),
);
const rootEnvironmentFile = fileURLToPath(new URL("../../../../.env", import.meta.url));

config({ path: rootEnvironmentFile, quiet: true });

export async function prepareWorkerTestDatabase(): Promise<string> {
  const configuredUrl = process.env.DATABASE_URL;
  if (!configuredUrl) throw new Error("DATABASE_URL is required for worker integration tests");

  const testUrl = new URL(configuredUrl);
  const sourceDatabase = testUrl.pathname.slice(1);
  if (!sourceDatabase) throw new Error("DATABASE_URL must include a database name");

  const testDatabaseName = `${sourceDatabase}_test`;
  if (!/^[a-zA-Z0-9_]+$/.test(testDatabaseName)) {
    throw new Error("Worker integration tests require a safe test database name");
  }
  testUrl.pathname = `/${testDatabaseName}`;

  const adminUrl = new URL(testUrl);
  adminUrl.pathname = "/postgres";
  const admin = new pg.Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  try {
    const existing = await admin.query<{ exists: boolean }>(
      "SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1) AS exists",
      [testDatabaseName],
    );
    if (!existing.rows[0]?.exists) {
      await admin.query(`CREATE DATABASE "${testDatabaseName}"`);
    }
  } finally {
    await admin.end();
  }

  await new Promise<void>((resolve, reject) => {
    const migration = spawn(
      "corepack",
      ["pnpm", "exec", "prisma", "migrate", "deploy"],
      {
        cwd: databasePackageDirectory,
        env: { ...process.env, DATABASE_URL: testUrl.toString() },
        stdio: "inherit",
      },
    );
    migration.once("error", reject);
    migration.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Test database migration failed with exit code ${code}`));
    });
  });

  return testUrl.toString();
}
