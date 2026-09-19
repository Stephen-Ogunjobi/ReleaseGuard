import assert from "node:assert/strict";
import { test } from "node:test";
import { loadWorkerEnvironment } from "../src/index.ts";

const requiredEnvironment = {
  DATABASE_URL:
    "postgresql://release_guard:password@127.0.0.1:5432/release_guard",
  REDIS_PASSWORD: "local-redis-password",
};

test("worker configuration applies the documented defaults", () => {
  assert.deepEqual(loadWorkerEnvironment(requiredEnvironment), {
    nodeEnv: "development",
    databaseUrl: requiredEnvironment.DATABASE_URL,
    redis: {
      host: "127.0.0.1",
      port: 6379,
      password: requiredEnvironment.REDIS_PASSWORD,
    },
    concurrency: 1,
    attemptTimeoutMs: 120_000,
  });
});

test("worker configuration parses explicit values", () => {
  const configuration = loadWorkerEnvironment({
    ...requiredEnvironment,
    NODE_ENV: "production",
    REDIS_HOST: "redis.internal",
    REDIS_PORT: "6380",
    WORKER_CONCURRENCY: "4",
    ATTEMPT_TIMEOUT_MS: "60000",
  });

  assert.equal(configuration.nodeEnv, "production");
  assert.equal(configuration.redis.host, "redis.internal");
  assert.equal(configuration.redis.port, 6380);
  assert.equal(configuration.concurrency, 4);
  assert.equal(configuration.attemptTimeoutMs, 60_000);
});

for (const [name, value] of [
  ["WORKER_CONCURRENCY", "0"],
  ["WORKER_CONCURRENCY", "1.5"],
  ["ATTEMPT_TIMEOUT_MS", "-1"],
  ["ATTEMPT_TIMEOUT_MS", "not-a-number"],
] as const) {
  test(`worker configuration rejects invalid ${name}`, () => {
    assert.throws(
      () => loadWorkerEnvironment({ ...requiredEnvironment, [name]: value }),
      new RegExp(`${name} must be a positive integer`),
    );
  });
}

test("worker configuration requires a valid PostgreSQL URL", () => {
  assert.throws(
    () =>
      loadWorkerEnvironment({
        ...requiredEnvironment,
        DATABASE_URL: "not-a-url",
      }),
    /DATABASE_URL must be a valid PostgreSQL connection URL/,
  );
  assert.throws(
    () =>
      loadWorkerEnvironment({
        ...requiredEnvironment,
        DATABASE_URL: "memory://release-guard",
      }),
    /DATABASE_URL must use the postgresql:\/\/ or postgres:\/\/ protocol/,
  );
});

test("worker configuration requires a Redis password", () => {
  assert.throws(
    () => loadWorkerEnvironment({ DATABASE_URL: requiredEnvironment.DATABASE_URL }),
    /REDIS_PASSWORD is required and must not be empty/,
  );
  assert.throws(
    () => loadWorkerEnvironment({ ...requiredEnvironment, REDIS_PASSWORD: "" }),
    /REDIS_PASSWORD is required and must not be empty/,
  );
});

test("worker configuration rejects an unsupported environment mode", () => {
  assert.throws(
    () => loadWorkerEnvironment({ ...requiredEnvironment, NODE_ENV: "staging" }),
    /NODE_ENV must be one of: development, test, production/,
  );
});
