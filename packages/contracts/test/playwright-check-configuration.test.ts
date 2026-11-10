import assert from "node:assert/strict";
import { test } from "node:test";
import {
  InvalidPlaywrightCheckConfigurationError,
  parsePlaywrightCheckConfiguration,
  UnsupportedPlaywrightCheckSchemaVersionError,
} from "../src/index.ts";

const validConfiguration = {
  kind: "LOGIN",
  startPath: "/login",
  email: "learner@example.test",
  password: "demo-password",
  successPath: "/dashboard",
  successTestId: "dashboard-heading",
};

test("parses the version-one login configuration", () => {
  assert.deepEqual(
    parsePlaywrightCheckConfiguration(1, validConfiguration),
    validConfiguration,
  );
});

test("rejects unsupported schema versions before reading configuration", () => {
  assert.throws(
    () => parsePlaywrightCheckConfiguration(2, validConfiguration),
    UnsupportedPlaywrightCheckSchemaVersionError,
  );
});

test("rejects missing and invalid login fields", () => {
  assert.throws(
    () =>
      parsePlaywrightCheckConfiguration(1, {
        ...validConfiguration,
        email: "not-an-email",
        password: "",
        successTestId: " dashboard-heading ",
      }),
    (error: unknown) => {
      assert.ok(error instanceof InvalidPlaywrightCheckConfigurationError);
      assert.match(error.message, /email/);
      assert.match(error.message, /password/);
      assert.match(error.message, /successTestId/);
      return true;
    },
  );
});

for (const path of [
  "login",
  "https://outside.example/login",
  "//outside.example/login",
  "/\\outside.example/login",
  "/login?redirect=/dashboard",
  "/login#form",
  "/../admin",
]) {
  test(`rejects unsafe application path: ${path}`, () => {
    assert.throws(
      () =>
        parsePlaywrightCheckConfiguration(1, {
          ...validConfiguration,
          startPath: path,
        }),
      InvalidPlaywrightCheckConfigurationError,
    );
  });
}

test("rejects unknown properties instead of silently ignoring typos", () => {
  assert.throws(
    () =>
      parsePlaywrightCheckConfiguration(1, {
        ...validConfiguration,
        sucessPath: "/misspelled",
      }),
    InvalidPlaywrightCheckConfigurationError,
  );
});

test("validation errors do not expose credential values", () => {
  const secret = "do-not-print-this-password";

  assert.throws(
    () =>
      parsePlaywrightCheckConfiguration(1, {
        ...validConfiguration,
        password: secret,
        unexpected: true,
      }),
    (error: unknown) => {
      assert.ok(error instanceof InvalidPlaywrightCheckConfigurationError);
      assert.doesNotMatch(error.message, new RegExp(secret));
      return true;
    },
  );
});
