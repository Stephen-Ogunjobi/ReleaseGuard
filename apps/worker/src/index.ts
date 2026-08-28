import { loadCommonEnvironment, readPositiveInteger } from "@release-guard/config";
import { createDatabase } from "@release-guard/db";

const environment = loadCommonEnvironment();
const intervalMs = readPositiveInteger("WORKER_INTERVAL_MS", 5_000);
const database = createDatabase(environment.databaseUrl);

async function run(): Promise<void> {
  const releases = await database.listReleases();
  console.log(`worker checked ${releases.length} release(s)`);
}

console.log(`worker started; polling every ${intervalMs}ms`);
await run();
setInterval(() => void run(), intervalMs);
