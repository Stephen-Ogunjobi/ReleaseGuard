export class PlaywrightBrowserLaunchError extends Error {
  constructor(cause: unknown) {
    super("Playwright Chromium failed to launch", { cause });
    this.name = "PlaywrightBrowserLaunchError";
  }
}

export class PlaywrightBrowserClosedError extends Error {
  constructor() {
    super("Playwright browser lifecycle is already closed");
    this.name = "PlaywrightBrowserClosedError";
  }
}
