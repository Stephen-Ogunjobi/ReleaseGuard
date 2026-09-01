import { loadApiEnvironment } from "@release-guard/config";

export function validateEnvironment(configuration: Record<string, unknown>) {
  const source: NodeJS.ProcessEnv = {};

  for (const [key, value] of Object.entries(configuration)) {
    if (typeof value === "string") source[key] = value;
  }

  const validated = loadApiEnvironment(source);
  return {
    ...configuration,
    NODE_ENV: validated.nodeEnv,
    DATABASE_URL: validated.databaseUrl,
    API_PORT: validated.port,
    REDIS_HOST: validated.redis.host,
    REDIS_PORT: validated.redis.port,
    REDIS_PASSWORD: validated.redis.password,
  };
}
