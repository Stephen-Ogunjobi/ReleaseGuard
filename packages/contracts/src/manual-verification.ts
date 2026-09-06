export interface CreateManualVerificationRequest {
  environmentId: string;
}

export interface QueuedCheckRunResponse {
  id: string;
  checkVersionId: string;
  status: "QUEUED";
  createdAt: string;
}

export interface QueuedVerificationResponse {
  id: string;
  projectId: string;
  environmentId: string;
  triggerType: "MANUAL";
  status: "QUEUED";
  correlationId: string;
  createdAt: string;
  checkRuns: readonly QueuedCheckRunResponse[];
}
