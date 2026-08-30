import { loadDemoAppEnvironment } from "@release-guard/config";
import { createDemoServer } from "./server.ts";

const environment = loadDemoAppEnvironment();
const server = createDemoServer({ mode: environment.mode });

server.listen(environment.port, "0.0.0.0", () => {
  console.log(
    `demo app listening on http://localhost:${environment.port}/login in ${environment.mode} mode`,
  );
});

function shutdown(): void {
  server.close((error) => {
    if (error) {
      console.error(error);
      process.exitCode = 1;
    }
  });
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
