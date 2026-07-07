import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdmin } from "@/lib/admin/auth";
import { saveAiConfig } from "@/lib/ai/config";

const optionalDimension = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  return value;
}, z.coerce.number().int().min(64).max(3072).optional());

const aiConfigSchema = z.object({
  provider: z.string().trim().min(1).default("openai"),
  chatModel: z.string().trim().min(1).default("gpt-4o-mini"),
  embeddingModel: z.string().trim().min(1).default("text-embedding-v4"),
  embeddingDimensions: optionalDimension,
  chunkSize: z.coerce.number().int().min(300).max(4000).default(900),
  overlap: z.coerce.number().int().min(0).max(800).default(120),
  topK: z.coerce.number().int().min(1).max(20).default(6),
  temperature: z.coerce.number().min(0).max(2).default(0.2),
  systemPrompt: z.string().trim().min(1)
});

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const contentType = request.headers.get("content-type") ?? "";
    const values =
      contentType.includes("application/json")
        ? await request.json()
        : Object.fromEntries((await request.formData()).entries());

    const parsed = aiConfigSchema.safeParse(values);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });
    }

    if (parsed.data.overlap >= parsed.data.chunkSize) {
      return NextResponse.json(
        { ok: false, error: "Overlap must be smaller than Chunk Size." },
        { status: 400 }
      );
    }

    const config = await saveAiConfig(parsed.data);

    if (contentType.includes("application/json")) {
      return NextResponse.json({ ok: true, config });
    }

    return NextResponse.redirect(new URL("/admin/ai-config?saved=1", request.url), { status: 303 });
  } catch (error) {
    const authResponse = adminAuthErrorResponse(error);
    if (authResponse) return authResponse;
    const message = error instanceof Error ? error.message : "Failed to save AI config.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
