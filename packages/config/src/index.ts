export type RuntimeEnvironment = "development" | "test" | "production";

export interface CommonEnvironment {
  nodeEnv: RuntimeEnvironment;
  databaseUrl: string;
}

export interface ApiEnvironment extends CommonEnvironment {
  port: number;
}

export type DemoAppMode = "WORKING" | "BROKEN";

export interface DemoAppEnvironment {
  mode: DemoAppMode;
  port: number;
}

function readEnum<const T extends readonly string[]>(
  name: string,
  values: T,
  fallback: T[number],
  source: NodeJS.ProcessEnv = process.env,
): T[number] {
  const value = source[name] ?? fallback;
  if (!values.includes(value)) {
    throw new Error(`${name} must be one of: ${values.join(", ")}`);
  }
  return value as T[number];
}

function readNonEmpty(
  name: string,
  fallback: string,
  source: NodeJS.ProcessEnv = process.env,
): string {
  const value = source[name] ?? fallback;
  if (value.trim() === "") throw new Error(`${name} must not be empty`);
  return value;
}

export function readPositiveInteger(
  name: string,
  fallback: number,
  source: NodeJS.ProcessEnv = process.env,
): number {
  const raw = source[name] ?? String(fallback);
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

export function loadDemoAppEnvironment(source: NodeJS.ProcessEnv = process.env): DemoAppEnvironment {
  return {
    mode: readEnum("DEMO_APP_MODE", ["WORKING", "BROKEN"] as const, "WORKING", source),
    port: readPositiveInteger("DEMO_APP_PORT", 3100, source),
  };
}

export function loadCommonEnvironment(source: NodeJS.ProcessEnv = process.env): CommonEnvironment {
  return {
    nodeEnv: readEnum(
      "NODE_ENV",
      ["development", "test", "production"] as const,
      "development",
      source,
    ),
    databaseUrl: readNonEmpty("DATABASE_URL", "memory://release-guard", source),
  };
}

export function loadApiEnvironment(source: NodeJS.ProcessEnv = process.env): ApiEnvironment {
  const common = loadCommonEnvironment(source);
  let databaseUrl: URL;

  try {
    databaseUrl = new URL(common.databaseUrl);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL connection URL");
  }

  if (databaseUrl.protocol !== "postgresql:" && databaseUrl.protocol !== "postgres:") {
    throw new Error("DATABASE_URL must use the postgresql:// or postgres:// protocol");
  }

  return {
    ...common,
    port: readPositiveInteger("API_PORT", 3000, source),
  };
}
