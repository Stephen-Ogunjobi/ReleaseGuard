export interface HealthResponse {
  status: "ok";
  service: string;
  timestamp: string;
}

export interface ReleaseRecord {
  id: string;
  version: string;
  createdAt: string;
}
