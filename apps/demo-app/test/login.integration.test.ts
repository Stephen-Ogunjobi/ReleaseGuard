import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import { loadDemoAppEnvironment, type DemoAppMode } from "@release-guard/config";
import { createDemoServer, DEMO_CREDENTIALS } from "../src/server.ts";

async function withServer(mode: DemoAppMode, run: (baseUrl: string) => Promise<void>): Promise<void> {
  const server = createDemoServer({ mode });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as AddressInfo;

  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

function loginRequest(
  baseUrl: string,
  email: string = DEMO_CREDENTIALS.email,
  password: string = DEMO_CREDENTIALS.password,
) {
  return fetch(`${baseUrl}/login`, {
    method: "POST",
    redirect: "manual",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ email, password }),
  });
}

test("health endpoint reports readiness", async () => {
  await withServer("WORKING", async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health`);
    const body = (await response.json()) as { status: string; service: string };
    assert.equal(response.status, 200);
    assert.deepEqual({ status: body.status, service: body.service }, { status: "ok", service: "demo-app" });
  });
});

test("WORKING mode redirects a valid login to the dashboard", async () => {
  await withServer("WORKING", async (baseUrl) => {
    const login = await loginRequest(baseUrl);
    assert.equal(login.status, 303);
    assert.equal(login.headers.get("location"), "/dashboard");

    const dashboard = await fetch(`${baseUrl}/dashboard`);
    assert.match(await dashboard.text(), /data-testid="dashboard-heading"/);
  });
});

test("BROKEN mode keeps a valid login away from the dashboard", async () => {
  await withServer("BROKEN", async (baseUrl) => {
    const response = await loginRequest(baseUrl);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("location"), null);
    assert.match(await response.text(), /Login is temporarily unavailable/);
  });
});

test("incorrect credentials never reach the dashboard", async () => {
  for (const mode of ["WORKING", "BROKEN"] as const) {
    await withServer(mode, async (baseUrl) => {
      const response = await loginRequest(baseUrl, "wrong@example.test", "wrong-password");
      assert.equal(response.status, 401);
      assert.equal(response.headers.get("location"), null);
    });
  }
});

test("unknown routes return 404", async () => {
  await withServer("WORKING", async (baseUrl) => {
    const response = await fetch(`${baseUrl}/unknown`);
    assert.equal(response.status, 404);
  });
});

test("invalid demo mode is rejected during configuration", () => {
  assert.throws(
    () => loadDemoAppEnvironment({ DEMO_APP_MODE: "RANDOM" }),
    /DEMO_APP_MODE must be one of: WORKING, BROKEN/,
  );
});
