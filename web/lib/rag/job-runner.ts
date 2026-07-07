import "server-only";

import { appendSyncLog, createSyncJob, readAdminState, updateSyncJob } from "@/lib/admin/state-store";
import type { SyncJob } from "@/lib/admin/types";
import { rebuildEmbeddings } from "@/lib/rag/embeddings";

function embeddingSummaryFromJob(job: SyncJob | undefined) {
  return {
    latestJob: job ?? null,
    activeJob: job && (job.status === "pending" || job.status === "running") ? job : null
  };
}

export async function getEmbeddingJobState() {
  const state = await readAdminState();
  const latestJob = state.jobs.find((job) => job.source === "embedding-rebuild");
  return embeddingSummaryFromJob(latestJob);
}

export async function enqueueEmbeddingRebuildJob() {
  const current = await getEmbeddingJobState();
  if (current.activeJob) {
    return {
      job: current.activeJob,
      created: false
    };
  }

  const job = await createSyncJob({ source: "embedding-rebuild" });
  return {
    job,
    created: true
  };
}

export async function runEmbeddingJob(jobId: string) {
  const startedAt = new Date().toISOString();
  await updateSyncJob(jobId, { status: "running", startedAt, error: undefined });
  await appendSyncLog({
    jobId,
    level: "info",
    step: "start",
    message: "Embedding rebuild started."
  });

  try {
    await appendSyncLog({
      jobId,
      level: "info",
      step: "embedding",
      message: "Reading active notes and rebuilding vector chunks."
    });

    const result = await rebuildEmbeddings();
    const summary = {
      notes: result.notes,
      chunks: result.chunks
    };

    await updateSyncJob(jobId, {
      status: "success",
      finishedAt: new Date().toISOString(),
      summary
    });
    await appendSyncLog({
      jobId,
      level: "info",
      step: "finish",
      message: `Embedding rebuild finished: ${result.notes} notes, ${result.chunks} chunks.`,
      meta: summary
    });
    return summary;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown embedding rebuild error";
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
    throw error;
  }
}
