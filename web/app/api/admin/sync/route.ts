import { NextResponse } from "next/server";
import { enqueueSyncJob, getLocalVaultSnapshot, runSyncJob } from "@/lib/sync/runner";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  const values =
    contentType.includes("application/json")
      ? ((await request.json()) as { action?: string; targetPath?: string })
      : Object.fromEntries((await request.formData()).entries());
  const action = String(values.action ?? "sync");
  const targetPath = values.targetPath ? String(values.targetPath) : undefined;

  if (action === "local-scan") {
    if (!contentType.includes("application/json")) {
      return NextResponse.redirect(new URL("/admin/sync?local=scan", request.url), { status: 303 });
    }
    return NextResponse.json({ ok: true, local: getLocalVaultSnapshot() });
  }

  const job = await enqueueSyncJob("manual", targetPath);
  await runSyncJob(job.id);

  if (contentType.includes("application/json")) {
    return NextResponse.json({ ok: true, jobId: job.id });
  }

  return NextResponse.redirect(new URL("/admin/sync?job=created", request.url), { status: 303 });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    local: getLocalVaultSnapshot()
  });
}
