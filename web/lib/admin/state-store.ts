import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { defaultRepositoryConfig } from "./defaults";
import type { AdminState, RepositoryConfig, SyncJob, SyncLog } from "./types";
import { getRuntimeCached } from "@/lib/cache/runtime-cache";
import { invalidateAdminCache } from "@/lib/cache/invalidation";
import { databaseConfigured, prisma } from "@/lib/db/prisma";

const statePath = path.join(process.cwd(), ".data", "admin-state.json");
const repositoryConfigId = "singleton";

const sourceToDatabase = {
  manual: "manual",
  webhook: "webhook",
  "publish-writeback": "publish_writeback",
  "cron-retry": "cron_retry",
  "embedding-rebuild": "embedding_rebuild"
} as const;

function now() {
  return new Date().toISOString();
}

function id(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function ensureDataDir() {
  await fs.mkdir(path.dirname(statePath), { recursive: true });
}

function shouldUseDatabase() {
  if (process.env.NEXT_PHASE === "phase-production-build" || process.env.npm_lifecycle_event === "build") {
    return false;
  }
  return databaseConfigured() && process.env.ADMIN_STATE_STORE !== "file";
}

function warnDatabaseFallback(error: unknown) {
  if (process.env.NODE_ENV === "development") {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Admin database store unavailable, falling back to local file: ${message}`);
  }
}

async function tryDatabase<T>(operation: () => Promise<T>) {
  if (!shouldUseDatabase()) return undefined;
  try {
    return await operation();
  } catch (error) {
    warnDatabaseFallback(error);
    return undefined;
  }
}

function optionalDate(value?: string) {
  return value ? new Date(value) : undefined;
}

function toRepositoryConfig(row: {
  provider: "gitee";
  repoUrl: string;
  owner: string;
  repo: string;
  branch: string;
  syncMode: "manual" | "auto";
  lastSyncedCommit: string | null;
  lastSyncedAt: Date | null;
  tokenEncrypted: string | null;
  tokenMasked: string | null;
  webhookSecretHash: string | null;
  webhookSecretMasked: string | null;
}): RepositoryConfig {
  return {
    provider: row.provider,
    repoUrl: row.repoUrl,
    owner: row.owner,
    repo: row.repo,
    branch: row.branch,
    syncMode: row.syncMode,
    lastSyncedCommit: row.lastSyncedCommit ?? undefined,
    lastSyncedAt: row.lastSyncedAt?.toISOString(),
    tokenEncrypted: row.tokenEncrypted ?? undefined,
    tokenMasked: row.tokenMasked ?? undefined,
    webhookSecretHash: row.webhookSecretHash ?? undefined,
    webhookSecretMasked: row.webhookSecretMasked ?? undefined
  };
}

function sourceFromDatabase(source: string): SyncJob["source"] {
  if (source === "publish_writeback") return "publish-writeback";
  if (source === "cron_retry") return "cron-retry";
  if (source === "embedding_rebuild") return "embedding-rebuild";
  return source as SyncJob["source"];
}

function toSyncJob(row: {
  id: string;
  source: string;
  status: SyncJob["status"];
  targetPath: string | null;
  commitSha: string | null;
  summary: Prisma.JsonValue | null;
  error: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): SyncJob {
  return {
    id: row.id,
    source: sourceFromDatabase(row.source),
    status: row.status,
    targetPath: row.targetPath ?? undefined,
    commitSha: row.commitSha ?? undefined,
    summary: (row.summary as Record<string, unknown> | null) ?? undefined,
    error: row.error ?? undefined,
    startedAt: row.startedAt?.toISOString(),
    finishedAt: row.finishedAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function toSyncLog(row: {
  id: string;
  jobId: string;
  level: string;
  step: string;
  message: string;
  meta: Prisma.JsonValue | null;
  createdAt: Date;
}): SyncLog {
  return {
    id: row.id,
    jobId: row.jobId,
    level: row.level as SyncLog["level"],
    step: row.step,
    message: row.message,
    meta: (row.meta as Record<string, unknown> | null) ?? undefined,
    createdAt: row.createdAt.toISOString()
  };
}

async function readFileState(): Promise<AdminState> {
  try {
    const content = await fs.readFile(statePath, "utf8");
    const parsed = JSON.parse(content) as AdminState;
    return {
      repository: { ...defaultRepositoryConfig, ...parsed.repository },
      jobs: parsed.jobs ?? [],
      logs: parsed.logs ?? []
    };
  } catch {
    return {
      repository: defaultRepositoryConfig,
      jobs: [],
      logs: []
    };
  }
}

async function queryDatabaseState(): Promise<AdminState> {
  const [repository, jobs, logs] = await Promise.all([
    prisma.repositoryConfig.findUnique({ where: { id: repositoryConfigId } }),
    prisma.syncJob.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.syncLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 })
  ]);

  return {
    repository: repository ? toRepositoryConfig(repository) : (await readFileState()).repository,
    jobs: jobs.map(toSyncJob),
    logs: logs.map(toSyncLog)
  };
}

async function readDatabaseState(): Promise<AdminState | undefined> {
  return tryDatabase(async () => {
    return getRuntimeCached("admin:state", 30 * 1000, queryDatabaseState);
  });
}

export async function readAdminState(): Promise<AdminState> {
  return (await readDatabaseState()) ?? (await readFileState());
}

export async function writeAdminState(state: AdminState) {
  await ensureDataDir();
  await fs.writeFile(statePath, JSON.stringify(state, null, 2), "utf8");
}

export async function getRepositoryConfig() {
  return (await readAdminState()).repository;
}

export async function saveRepositoryConfig(repository: RepositoryConfig) {
  const saved = await tryDatabase(async () => {
    const data = {
      provider: repository.provider,
      repoUrl: repository.repoUrl,
      owner: repository.owner,
      repo: repository.repo,
      branch: repository.branch,
      syncMode: repository.syncMode,
      lastSyncedCommit: repository.lastSyncedCommit,
      lastSyncedAt: optionalDate(repository.lastSyncedAt),
      tokenEncrypted: repository.tokenEncrypted,
      tokenMasked: repository.tokenMasked,
      webhookSecretHash: repository.webhookSecretHash,
      webhookSecretMasked: repository.webhookSecretMasked
    };

    const row = await prisma.repositoryConfig.upsert({
      where: { id: repositoryConfigId },
      create: { id: repositoryConfigId, ...data },
      update: data
    });

    invalidateAdminCache();
    return toRepositoryConfig(row);
  });
  if (saved) return saved;
  if (process.env.NODE_ENV === "production" && shouldUseDatabase()) {
    throw new Error("Repository settings could not be saved to the database.");
  }

  const state = await readFileState();
  state.repository = repository;
  await writeAdminState(state);
  invalidateAdminCache();
  return saved ?? repository;
}

export async function createSyncJob(input: Pick<SyncJob, "source" | "targetPath" | "commitSha">) {
  const databaseJob = await tryDatabase(async () => {
    const row = await prisma.syncJob.create({
      data: {
        source: sourceToDatabase[input.source],
        status: "pending",
        targetPath: input.targetPath,
        commitSha: input.commitSha
      }
    });
    invalidateAdminCache();
    return toSyncJob(row);
  });
  if (databaseJob) return databaseJob;

  const state = await readFileState();
  const job: SyncJob = {
    id: id("job"),
    source: input.source,
    status: "pending",
    targetPath: input.targetPath,
    commitSha: input.commitSha,
    createdAt: now(),
    updatedAt: now()
  };
  state.jobs.unshift(job);
  state.jobs = state.jobs.slice(0, 50);
  await writeAdminState(state);
  invalidateAdminCache();
  return job;
}

export async function updateSyncJob(jobId: string, patch: Partial<SyncJob>) {
  const databaseJob = await tryDatabase(async () => {
    const data: Prisma.SyncJobUpdateInput = {
      ...(patch.source ? { source: sourceToDatabase[patch.source] } : {}),
      ...(patch.status ? { status: patch.status } : {}),
      ...(patch.targetPath !== undefined ? { targetPath: patch.targetPath } : {}),
      ...(patch.commitSha !== undefined ? { commitSha: patch.commitSha } : {}),
      ...(patch.summary !== undefined ? { summary: patch.summary as Prisma.InputJsonValue } : {}),
      ...(patch.error !== undefined ? { error: patch.error } : {}),
      ...(patch.startedAt !== undefined ? { startedAt: optionalDate(patch.startedAt) } : {}),
      ...(patch.finishedAt !== undefined ? { finishedAt: optionalDate(patch.finishedAt) } : {})
    };

    const row = await prisma.syncJob.update({
      where: { id: jobId },
      data
    });
    invalidateAdminCache();
    return toSyncJob(row);
  });
  if (databaseJob) return databaseJob;

  const state = await readFileState();
  state.jobs = state.jobs.map((job) => (job.id === jobId ? { ...job, ...patch, updatedAt: now() } : job));
  await writeAdminState(state);
  invalidateAdminCache();
  return state.jobs.find((job) => job.id === jobId);
}

export async function appendSyncLog(input: Omit<SyncLog, "id" | "createdAt">) {
  const databaseLog = await tryDatabase(async () => {
    const row = await prisma.syncLog.create({
      data: {
        jobId: input.jobId,
        level: input.level,
        step: input.step,
        message: input.message,
        meta: input.meta as Prisma.InputJsonValue | undefined
      }
    });
    invalidateAdminCache();
    return toSyncLog(row);
  });
  if (databaseLog) return databaseLog;

  const state = await readFileState();
  const log: SyncLog = {
    id: id("log"),
    createdAt: now(),
    ...input
  };
  state.logs.unshift(log);
  state.logs = state.logs.slice(0, 200);
  await writeAdminState(state);
  invalidateAdminCache();
  return log;
}

export async function getSyncDashboard() {
  const state = await readAdminState();
  return {
    repository: state.repository,
    jobs: state.jobs,
    logs: state.logs,
    latestJob: state.jobs[0],
    failedJobs: state.jobs.filter((job) => job.status === "failed").length,
    pendingJobs: state.jobs.filter((job) => job.status === "pending").length
  };
}
