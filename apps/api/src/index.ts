import { createServer } from "node:http";
import { loadCommonEnvironment, readPositiveInteger } from "@release-guard/config";
import type { HealthResponse } from "@release-guard/contracts";
import { createDatabase } from "@release-guard/db";

const environment = loadCommonEnvironment();
const port = readPositiveInteger("API_PORT", 3000);
const database = createDatabase(environment.databaseUrl);

const server = createServer(async (request, response) => {
  response.setHeader("content-type", "application/json");

  if (request.url === "/health") {
    const body: HealthResponse = {
      status: "ok",
      service: "api",
      timestamp: new Date().toISOString(),
    };
    response.end(JSON.stringify(body));
    return;
  }

  if (request.url === "/releases") {
    response.end(JSON.stringify(await database.listReleases()));
    return;
  }

  response.statusCode = 404;
  response.end(JSON.stringify({ error: "not_found" }));
});

server.listen(port, () => console.log(`api listening on http://localhost:${port}`));
