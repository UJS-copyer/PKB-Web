export type RepositoryProvider = "gitee";
export type SyncMode = "manual" | "auto";
export type SyncJobSource = "manual" | "webhook" | "publish-writeback" | "cron-retry" | "embedding-rebuild";
export type SyncJobStatus = "pending" | "running" | "success" | "failed" | "ignored";

export type RepositoryConfig = {
  provider: RepositoryProvider;
  repoUrl: string;
  owner: string;
  repo: string;
  branch: string;
  syncMode: SyncMode;
  lastSyncedCommit?: string;
  lastSyncedAt?: string;
  tokenEncrypted?: string;
  tokenMasked?: string;
  webhookSecretHash?: string;
  webhookSecretMasked?: string;
};

export type SyncJob = {
  id: string;
  source: SyncJobSource;
  status: SyncJobStatus;
  targetPath?: string;
  commitSha?: string;
  summary?: Record<string, unknown>;
  error?: string;
  startedAt?: string;
  finishedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type SyncLog = {
  id: string;
  jobId: string;
  level: "info" | "warn" | "error";
  step: string;
  message: string;
  meta?: Record<string, unknown>;
  createdAt: string;
};

export type AdminState = {
  repository: RepositoryConfig;
  jobs: SyncJob[];
  logs: SyncLog[];
};
