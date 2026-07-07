import { after, NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdmin } from "@/lib/admin/auth";
import { enqueueEmbeddingRebuildJob } from "@/lib/rag/job-runner";
import { processJob } from "@/lib/sync/runner";

export const maxDuration = 300;

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const wantsJson =
    requestUrl.searchParams.get("format") === "json" || request.headers.get("accept")?.includes("application/json");

  try {
    await requireAdmin();
    const { job, created } = await enqueueEmbeddingRebuildJob();
    if (created) {
      after(async () => {
        try {
          await processJob(job.id);
        } catch (error) {
          console.error("[admin/ai-config/rebuild:after]", error);
        }
      });
    }

    if (wantsJson) {
      return NextResponse.json({
        ok: true,
        queued: true,
        created,
        jobId: job.id,
        status: job.status
      });
    }

    return NextResponse.redirect(new URL(`/admin/ai-config?queued=${job.id}`, request.url), { status: 303 });
  } catch (error) {
    console.error("[admin/ai-config/rebuild]", error);
    const authResponse = adminAuthErrorResponse(error);
    if (authResponse) return authResponse;
    const message = error instanceof Error ? error.message : "Failed to rebuild embeddings.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
