import { NextResponse } from "next/server";
import { processPendingJobs } from "@/lib/sync/runner";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET ?? process.env.SYNC_CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (secret && authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const processed = await processPendingJobs();
  return NextResponse.json({ ok: true, processed });
}
