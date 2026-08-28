import type { ReleaseRecord } from "@release-guard/contracts";

export interface Database {
  listReleases(): Promise<readonly ReleaseRecord[]>;
}

export function createDatabase(databaseUrl: string): Database {
  if (!databaseUrl.startsWith("memory://")) {
    throw new Error("Only memory:// database URLs are supported by the initial scaffold");
  }

  const releases: ReleaseRecord[] = [];
  return {
    async listReleases() {
      return releases;
    },
  };
}
