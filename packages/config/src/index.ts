export type RuntimeEnvironment = "development" | "test" | "production";

export interface CommonEnvironment {
  nodeEnv: RuntimeEnvironment;
  databaseUrl: string;
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

function readNonEmpty(name: string, fallback: string): string {
  const value = process.env[name] ?? fallback;
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

export function loadCommonEnvironment(): CommonEnvironment {
  return {
    nodeEnv: readEnum("NODE_ENV", ["development", "test", "production"] as const, "development"),
    databaseUrl: readNonEmpty("DATABASE_URL", "memory://release-guard"),
  };
}
