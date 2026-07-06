import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdmin } from "@/lib/admin/auth";
import { GiteeRepositoryAdapter } from "@/lib/gitee/client";
import { getRepositoryConfig } from "@/lib/admin/state-store";
import { enqueueSyncJob } from "@/lib/sync/runner";
import { updateFrontmatter } from "@/lib/publish/frontmatter";

function toBoolean(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  return value === true || value === "true" || value === "on";
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const contentType = request.headers.get("content-type") ?? "";
    const values =
      contentType.includes("application/json")
        ? await request.json()
        : Object.fromEntries((await request.formData()).entries());
    const sourcePath = String(values.sourcePath ?? "");

    if (!sourcePath) {
      return NextResponse.json({ ok: false, error: "sourcePath is required." }, { status: 400 });
    }

    const config = await getRepositoryConfig();
    const adapter = new GiteeRepositoryAdapter(config);
    const file = await adapter.getFileContent(sourcePath);
    const next = updateFrontmatter(file.content, {
      published: toBoolean(values.published),
      featured: toBoolean(values.featured),
      slug: values.slug ? String(values.slug) : undefined,
      cover: values.cover ? String(values.cover) : undefined,
      category: values.category ? String(values.category) : undefined
    });

    await adapter.updateFile(sourcePath, next, `chore(site): update publish metadata for ${sourcePath}`);
    const job = await enqueueSyncJob("publish-writeback", sourcePath);

    if (contentType.includes("application/json")) {
      return NextResponse.json({ ok: true, jobId: job.id });
    }

    return NextResponse.redirect(new URL("/admin/publish?saved=1", request.url), { status: 303 });
  } catch (error) {
    const authResponse = adminAuthErrorResponse(error);
    if (authResponse) return authResponse;
    const message = error instanceof Error ? error.message : "Publish update failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
