import {
  chromium,
  type Browser,
  type BrowserContext,
} from "playwright";
import {
  PlaywrightBrowserClosedError,
  PlaywrightBrowserLaunchError,
} from "./playwright-errors.ts";

export interface PlaywrightBrowserOptions {
  headless?: boolean;
  launchBrowser?: () => Promise<Browser>;
}

export class PlaywrightBrowser {
  private readonly launchBrowser: () => Promise<Browser>;
  private readonly contexts = new Set<BrowserContext>();
  private browser: Browser | undefined;
  private launchPromise: Promise<Browser> | undefined;
  private closePromise: Promise<void> | undefined;
  private closed = false;

  constructor(options: PlaywrightBrowserOptions = {}) {
    const headless = options.headless ?? true;
    this.launchBrowser =
      options.launchBrowser ?? (() => chromium.launch({ headless }));
  }

  get activeContextCount(): number {
    return this.contexts.size;
  }

  async start(): Promise<void> {
    await this.getBrowser();
  }

  async withContext<T>(
    operation: (context: BrowserContext) => Promise<T>,
  ): Promise<T> {
    const browser = await this.getBrowser();
    const context = await browser.newContext();
    this.contexts.add(context);
    context.once("close", () => this.contexts.delete(context));

    try {
      return await operation(context);
    } finally {
      await context.close();
    }
  }

  close(): Promise<void> {
    this.closed = true;
    this.closePromise ??= this.closeResources();
    return this.closePromise;
  }

  private async getBrowser(): Promise<Browser> {
    if (this.closed) throw new PlaywrightBrowserClosedError();

    if (this.browser) return this.browser;

    this.launchPromise ??= this.launchBrowser()
      .then(async (browser) => {
        if (this.closed) {
          await browser.close();
          throw new PlaywrightBrowserClosedError();
        }
        this.browser = browser;
        return browser;
      })
      .catch((error: unknown) => {
        this.launchPromise = undefined;
        if (error instanceof PlaywrightBrowserClosedError) throw error;
        throw new PlaywrightBrowserLaunchError(error);
      });

    return this.launchPromise;
  }

  private async closeResources(): Promise<void> {
    const contexts = [...this.contexts];
    this.contexts.clear();
    const errors: unknown[] = [];
    const contextResults = await Promise.allSettled(
      contexts.map((context) => context.close()),
    );
    for (const result of contextResults) {
      if (result.status === "rejected") errors.push(result.reason);
    }

    const browser =
      this.browser ?? (await this.launchPromise?.catch(() => undefined));
    this.browser = undefined;
    if (browser) {
      try {
        await browser.close();
      } catch (error) {
        errors.push(error);
      }
    }

    if (errors.length > 0) {
      throw new AggregateError(errors, "Playwright browser cleanup failed");
    }
  }
}
