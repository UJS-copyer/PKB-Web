import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdmin } from "@/lib/admin/auth";
import { uploadToBlob, type UploadPurpose } from "@/lib/blob/upload";

export const runtime = "nodejs";

function isUploadPurpose(value: unknown): value is UploadPurpose {
  return value === "avatar" || value === "resume" || value === "project-cover";
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const form = await request.formData();
    const file = form.get("file");
    const purpose = form.get("purpose");

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "缺少上传文件。" }, { status: 400 });
    }
    if (!isUploadPurpose(purpose)) {
      return NextResponse.json({ ok: false, error: "上传用途无效。" }, { status: 400 });
    }

    const result = await uploadToBlob(file, purpose);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const authResponse = adminAuthErrorResponse(error);
    if (authResponse) return authResponse;
    const message = error instanceof Error ? error.message : "上传失败。";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
