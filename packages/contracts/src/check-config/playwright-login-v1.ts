import * as z from "zod";

export const PLAYWRIGHT_CHECK_SCHEMA_VERSION = 1 as const;

const applicationPathSchema = z
  .string()
  .min(1)
  .max(2_048)
  .refine(
    (value) =>
      value === value.trim() &&
      /^\/(?!\/)[^\s?#\\]*$/.test(value) &&
      value.split("/").every((segment) => segment !== "." && segment !== ".."),
    "must be an absolute application path without a host, query, hash, or traversal segment",
  );

const playwrightLoginCheckV1Schema = z.strictObject({
  kind: z.literal("LOGIN"),
  startPath: applicationPathSchema,
  email: z.email().max(320),
  password: z.string().min(1).max(1_024),
  successPath: applicationPathSchema,
  successTestId: z
    .string()
    .min(1)
    .max(256)
    .refine((value) => value === value.trim(), "must not have surrounding whitespace"),
});

export type PlaywrightLoginCheckV1 = z.infer<typeof playwrightLoginCheckV1Schema>;
export type PlaywrightCheckConfiguration = PlaywrightLoginCheckV1;

export class UnsupportedPlaywrightCheckSchemaVersionError extends Error {
  constructor(schemaVersion: number) {
    super(`Unsupported Playwright check schema version: ${schemaVersion}`);
    this.name = "UnsupportedPlaywrightCheckSchemaVersionError";
  }
}

interface ConfigurationValidationIssue {
  readonly path: readonly PropertyKey[];
  readonly message: string;
}

export class InvalidPlaywrightCheckConfigurationError extends Error {
  constructor(issues: readonly ConfigurationValidationIssue[]) {
    const details = issues
      .map((issue) => {
        const path =
          issue.path.length > 0
            ? issue.path.map((segment) => String(segment)).join(".")
            : "configuration";
        return `${path}: ${issue.message}`;
      })
      .join("; ");

    super(`Invalid Playwright check configuration: ${details}`);
    this.name = "InvalidPlaywrightCheckConfigurationError";
  }
}

export function parsePlaywrightCheckConfiguration(
  schemaVersion: number,
  configuration: unknown,
): PlaywrightCheckConfiguration {
  if (schemaVersion !== PLAYWRIGHT_CHECK_SCHEMA_VERSION) {
    throw new UnsupportedPlaywrightCheckSchemaVersionError(schemaVersion);
  }

  const result = playwrightLoginCheckV1Schema.safeParse(configuration);
  if (!result.success) {
    throw new InvalidPlaywrightCheckConfigurationError(result.error.issues);
  }

  return result.data;
}
