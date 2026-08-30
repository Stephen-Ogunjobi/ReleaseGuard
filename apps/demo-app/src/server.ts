import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { DemoAppMode } from "@release-guard/config";
import type { HealthResponse } from "@release-guard/contracts";
import { dashboardPage, loginPage } from "./pages.ts";

export const DEMO_CREDENTIALS = {
  email: "learner@example.test",
  password: "demo-password",
} as const;

export interface CreateDemoServerOptions {
  mode: DemoAppMode;
}

function sendHtml(response: ServerResponse, status: number, body: string): void {
  response.writeHead(status, {
    "cache-control": "no-store",
    "content-type": "text/html; charset=utf-8",
  });
  response.end(body);
}

async function readForm(request: IncomingMessage): Promise<URLSearchParams> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 16_384) throw new Error("Form body is too large");
    chunks.push(buffer);
  }

  return new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
}

// The mode is fixed when the server starts so a verification cannot become
// nondeterministic because configuration changes halfway through its journey.
export function createDemoServer(options: CreateDemoServerOptions): Server {
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://demo-app.local");

      if (request.method === "GET" && url.pathname === "/health") {
        const body: HealthResponse = {
          status: "ok",
          service: "demo-app",
          timestamp: new Date().toISOString(),
        };
        response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
        response.end(JSON.stringify(body));
        return;
      }

      if (request.method === "GET" && url.pathname === "/login") {
        sendHtml(response, 200, loginPage());
        return;
      }

      if (request.method === "POST" && url.pathname === "/login") {
        const form = await readForm(request);
        const validCredentials =
          form.get("email") === DEMO_CREDENTIALS.email &&
          form.get("password") === DEMO_CREDENTIALS.password;

        if (!validCredentials) {
          sendHtml(response, 401, loginPage("Invalid test credentials."));
          return;
        }

        if (options.mode === "BROKEN") {
          sendHtml(response, 200, loginPage("Login is temporarily unavailable."));
          return;
        }

        response.writeHead(303, { location: "/dashboard" });
        response.end();
        return;
      }

      if (request.method === "GET" && url.pathname === "/dashboard") {
        sendHtml(response, 200, dashboardPage());
        return;
      }

      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
    } catch {
      response.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
      response.end("Bad request");
    }
  });
}
