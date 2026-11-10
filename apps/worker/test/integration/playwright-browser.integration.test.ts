import assert from "node:assert/strict";
import { test } from "node:test";
import {
  PlaywrightBrowser,
  PlaywrightBrowserClosedError,
  PlaywrightBrowserLaunchError,
} from "../../src/runners/playwright/index.ts";

test("reuses Chromium while isolating and closing attempt contexts", async () => {
  const browser = new PlaywrightBrowser();
  let firstContext: unknown;

  try {
    await browser.start();
    await browser.withContext(async (context) => {
      firstContext = context;
      assert.equal(browser.activeContextCount, 1);
      await context.addCookies([
        {
          name: "release_guard_session",
          value: "first-attempt",
          url: "https://example.test",
        },
      ]);
      assert.equal((await context.cookies()).length, 1);
    });
    assert.equal(browser.activeContextCount, 0);

    await browser.withContext(async (context) => {
      assert.notEqual(context, firstContext);
      assert.deepEqual(await context.cookies("https://example.test"), []);
    });
    assert.equal(browser.activeContextCount, 0);
  } finally {
    await browser.close();
  }
});

test("closes an attempt context when its operation fails", async () => {
  const browser = new PlaywrightBrowser();
  const operationError = new Error("attempt failed");

  try {
    await assert.rejects(
      browser.withContext(async () => {
        throw operationError;
      }),
      (error: unknown) => error === operationError,
    );
    assert.equal(browser.activeContextCount, 0);
  } finally {
    await browser.close();
  }
});

test("browser shutdown is idempotent and prevents new contexts", async () => {
  const browser = new PlaywrightBrowser();
  await browser.start();

  await Promise.all([browser.close(), browser.close()]);
  await browser.close();

  await assert.rejects(
    browser.withContext(async () => undefined),
    PlaywrightBrowserClosedError,
  );
});

test("wraps Chromium launch failures in a controlled error", async () => {
  const cause = new Error("executable is unavailable");
  const browser = new PlaywrightBrowser({
    launchBrowser: async () => {
      throw cause;
    },
  });

  await assert.rejects(browser.start(), (error: unknown) => {
    assert.ok(error instanceof PlaywrightBrowserLaunchError);
    assert.equal(error.cause, cause);
    return true;
  });
  await browser.close();
});
