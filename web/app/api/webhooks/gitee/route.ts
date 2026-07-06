import { NextResponse } from "next/server";
import { verifySecret } from "@/lib/security/crypto";
import { appendSyncLog, getRepositoryConfig, updateSyncJob } from "@/lib/admin/state-store";
import { enqueueSyncJob } from "@/lib/sync/runner";

function webhookToken(request: Request) {
  return request.headers.get("x-gitee-token") ?? request.headers.get("x-gitee-signature") ?? "";
}

export async function POST(request: Request) {
  const config = await getRepositoryConfig();
  const token = webhookToken(request);

  if (!verifySecret(token, config.webhookSecretHash)) {
    return NextResponse.json({ ok: false, error: "Invalid webhook secret." }, { status: 401 });
  }

  const payload = (await request.json().catch(() => ({}))) as { after?: string; ref?: string };

  if (config.syncMode !== "auto") {
    const job = await enqueueSyncJob("webhook", undefined, payload.after);
    await updateSyncJob(job.id, {
      status: "ignored",
      finishedAt: new Date().toISOString(),
      summary: { reason: "sync mode is manual", ref: payload.ref, commitSha: payload.after }
    });
    await appendSyncLog({
      jobId: job.id,
      level: "warn",
      step: "webhook",
      message: "Webhook received but ignored because sync mode is manual.",
      meta: { ref: payload.ref, commitSha: payload.after }
    });
    return NextResponse.json({ ok: true, ignored: true, reason: "sync mode is manual" });
  }

  const job = await enqueueSyncJob("webhook", undefined, payload.after);
  return NextResponse.json({ ok: true, jobId: job.id });
}
