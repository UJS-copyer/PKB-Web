import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdmin } from "@/lib/admin/auth";
import { enqueueSyncJob, getLocalVaultSnapshot, runSyncJob } from "@/lib/sync/runner";

export async function POST(request: Request) {
  try {
    await requireAdmin();
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
  } catch (error) {
    const authResponse = adminAuthErrorResponse(error);
    if (authResponse) return authResponse;
    const message = error instanceof Error ? error.message : "Sync request failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({
      ok: true,
      local: getLocalVaultSnapshot()
    });
  } catch (error) {
    const authResponse = adminAuthErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ ok: false, error: "Sync status failed." }, { status: 500 });
  }
}
