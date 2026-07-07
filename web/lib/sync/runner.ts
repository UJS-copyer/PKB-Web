import "server-only";

import { invalidateContentCache } from "@/lib/cache/invalidation";
import { getAllNotes, getVaultIndex } from "@/lib/content/vault";
import { GiteeRepositoryAdapter } from "@/lib/gitee/client";
import {
  isAssetPath,
  isMarkdownPath,
  syncContentToDatabase
} from "@/lib/sync/content-store";
import {
  appendSyncLog,
  createSyncJob,
  getRepositoryConfig,
  readAdminState,
  saveRepositoryConfig,
  updateSyncJob
} from "@/lib/admin/state-store";
import type { SyncJobSource } from "@/lib/admin/types";
import { deleteEmbeddingsForPaths, syncEmbeddingsForNotes } from "@/lib/rag/embeddings";
import { runEmbeddingJob } from "@/lib/rag/job-runner";

type LocalVaultSnapshot = {
  notes: number;
  assets: number;
  path: string;
};

let localVaultSnapshotCache: { expiresAt: number; value: LocalVaultSnapshot } | null = null;

export async function enqueueSyncJob(source: SyncJobSource, targetPath?: string, commitSha?: string) {
  return createSyncJob({ source, targetPath, commitSha });
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, mapper: (item: T) => Promise<R>) {
  const results: R[] = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export async function runSyncJob(jobId: string) {
  const startedAt = new Date().toISOString();
  await updateSyncJob(jobId, { status: "running", startedAt });
  await appendSyncLog({
    jobId,
    level: "info",
    step: "start",
    message: "Sync job started."
  });

  try {
    const config = await getRepositoryConfig();
    const adapter = new GiteeRepositoryAdapter(config);

    await appendSyncLog({
      jobId,
      level: "info",
      step: "repository",
      message: `Reading ${config.repoUrl}#${config.branch}.`
    });

    const state = await readAdminState();
    const job = state.jobs.find((item) => item.id === jobId);
    const targetPath = job?.targetPath;
    const fullSync = !targetPath;
    const tree = await adapter.listFiles();
    const markdownFiles = tree.files
      .filter((file) => isMarkdownPath(file.path))
      .filter((file) => !targetPath || file.path === targetPath);
    const assetFiles = fullSync ? tree.files.filter((file) => isAssetPath(file.path)) : [];

    await appendSyncLog({
      jobId,
      level: "info",
      step: "scan",
      message: `Remote scan complete: ${markdownFiles.length} markdown files, ${assetFiles.length} assets.`,
      meta: {
        commitSha: tree.commitSha,
        markdownCount: markdownFiles.length,
        assetCount: assetFiles.length
      }
    });

    const remoteMarkdownFiles = await mapWithConcurrency(markdownFiles, 6, async (file) => {
      try {
        const remote = await adapter.getFileContent(file.path);
        return { ...file, content: remote.content, sha: remote.sha ?? file.sha };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to fetch markdown "${file.path}": ${message}`);
      }
    });

    await appendSyncLog({
      jobId,
      level: "info",
      step: "fetch",
      message: `Fetched ${remoteMarkdownFiles.length} markdown files for parsing.`
    });

    const contentSummary = await syncContentToDatabase({
      markdownFiles: remoteMarkdownFiles,
      assetFiles,
      fullSync
    });

    if (contentSummary.embeddingDeletedPaths.length > 0) {
      await deleteEmbeddingsForPaths(contentSummary.embeddingDeletedPaths);
    }

    if (contentSummary.embeddingNotes.length > 0) {
      await syncEmbeddingsForNotes(contentSummary.embeddingNotes);
    }

    await appendSyncLog({
      jobId,
      level: "info",
      step: "database",
      message:
        contentSummary.mode === "database-upsert"
          ? `Database upsert complete: ${contentSummary.notesUpserted} notes, ${contentSummary.assetsUpserted} assets.`
          : "Database sync skipped because DATABASE_URL is not configured.",
      meta: contentSummary
    });

    if (contentSummary.embeddingDeletedPaths.length > 0 || contentSummary.embeddingNotes.length > 0) {
      await appendSyncLog({
        jobId,
        level: "info",
        step: "embedding",
        message: `Incremental embeddings processed: ${contentSummary.embeddingNotes.length} updated notes, ${contentSummary.embeddingDeletedPaths.length} deleted notes.`,
        meta: {
          updated: contentSummary.embeddingNotes.length,
          deleted: contentSummary.embeddingDeletedPaths.length
        }
      });
    }

    await saveRepositoryConfig({
      ...config,
      lastSyncedCommit: tree.commitSha ?? config.lastSyncedCommit,
      lastSyncedAt: new Date().toISOString()
    });

    const summary = {
      commitSha: tree.commitSha,
      markdownCount: markdownFiles.length,
      assetCount: assetFiles.length,
      mode: contentSummary.mode,
      database: contentSummary,
      embedding: {
        updatedNotes: contentSummary.embeddingNotes.length,
        deletedNotes: contentSummary.embeddingDeletedPaths.length
      },
      nextSteps: ["supabase-storage-upload", "pgvector-embedding", "search-index-refresh"]
    };

    await updateSyncJob(jobId, {
      status: "success",
      finishedAt: new Date().toISOString(),
      summary
    });
    invalidateContentCache();

    await appendSyncLog({
      jobId,
      level: "info",
      step: "finish",
      message: "Sync job finished.",
      meta: summary
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sync error";
    await updateSyncJob(jobId, {
      status: "failed",
      finishedAt: new Date().toISOString(),
      error: message
    });
    await appendSyncLog({
      jobId,
      level: "error",
      step: "failed",
      message
    });
  }
}

export async function processPendingJobs(limit = 2) {
  const state = await readAdminState();
  const pending = state.jobs.filter((job) => job.status === "pending").slice(0, limit);
  for (const job of pending) {
    if (job.source === "embedding-rebuild") {
      await runEmbeddingJob(job.id);
      continue;
    }
    await runSyncJob(job.id);
  }
  return pending.length;
}

export async function processJob(jobId: string) {
  const state = await readAdminState();
  const job = state.jobs.find((item) => item.id === jobId);
  if (!job || job.status !== "pending") {
    return false;
  }

  if (job.source === "embedding-rebuild") {
    await runEmbeddingJob(job.id);
    return true;
  }

  await runSyncJob(job.id);
  return true;
}

export function getLocalVaultSnapshot() {
  const now = Date.now();
  if (localVaultSnapshotCache && localVaultSnapshotCache.expiresAt > now) {
    return localVaultSnapshotCache.value;
  }

  const notes = getAllNotes();
  const index = getVaultIndex();
  const snapshot = {
    notes: notes.length,
    assets: index.assets.length,
    path: index.root
  };
  localVaultSnapshotCache = {
    value: snapshot,
    expiresAt: now + 60 * 1000
  };
  return snapshot;
}
