export type RuntimeEnvironment = "development" | "test" | "production";

export interface CommonEnvironment {
  nodeEnv: RuntimeEnvironment;
  databaseUrl: string;
}

function readEnum<const T extends readonly string[]>(
  name: string,
  values: T,
  fallback: T[number],
): T[number] {
  const value = process.env[name] ?? fallback;
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

export function readPositiveInteger(name: string, fallback: number): number {
  const raw = process.env[name] ?? String(fallback);
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

export function loadCommonEnvironment(): CommonEnvironment {
  return {
    nodeEnv: readEnum("NODE_ENV", ["development", "test", "production"] as const, "development"),
    databaseUrl: readNonEmpty("DATABASE_URL", "memory://release-guard"),
  };
}
