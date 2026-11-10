import assert from "node:assert/strict";
import { test } from "node:test";
import type { Browser } from "playwright";
import { PlaywrightBrowser } from "../src/runners/playwright/index.ts";

test("concurrent startup launches one browser and shutdown closes it once", async () => {
  let launchCalls = 0;
  let closeCalls = 0;
  let releaseLaunch!: () => void;
  const launchReleased = new Promise<void>((resolve) => {
    releaseLaunch = resolve;
  });
  const fakeBrowser = {
    async close() {
      closeCalls += 1;
    },
  } as unknown as Browser;
  const browser = new PlaywrightBrowser({
    async launchBrowser() {
      launchCalls += 1;
      await launchReleased;
      return fakeBrowser;
    },
  });

  const starts = [browser.start(), browser.start(), browser.start()];
  releaseLaunch();
  await Promise.all(starts);
  assert.equal(launchCalls, 1);

  await Promise.all([browser.close(), browser.close(), browser.close()]);
  assert.equal(closeCalls, 1);
});
