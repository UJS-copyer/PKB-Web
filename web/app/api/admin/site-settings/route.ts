import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdmin } from "@/lib/admin/auth";
import { saveSiteSettings } from "@/lib/site-settings";

const booleanFromForm = z.union([z.boolean(), z.literal("true"), z.literal("false")]).transform((value) => {
  if (typeof value === "boolean") return value;
  return value === "true";
});

const siteSettingsSchema = z.object({
  name: z.string().trim().min(1),
  title: z.string().trim().min(1),
  slogan: z.string().trim().min(1),
  description: z.string().trim().min(1),
  bio: z.string().trim().min(1),
  education: z.string().trim().optional().default(""),
  research: z.string().trim().optional().default(""),
  skills: z.union([z.string(), z.array(z.string())]).optional().default(""),
  resumeUrl: z.string().trim().optional().default(""),
  logo: z.string().trim().optional().default(""),
  avatar: z.string().trim().optional().default(""),
  github: z.string().trim().optional().default(""),
  email: z.string().trim().optional().default(""),
  themeColor: z.string().trim().optional().default("#2563eb"),
  darkMode: booleanFromForm.optional().default(true)
});

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const contentType = request.headers.get("content-type") ?? "";
    const values =
      contentType.includes("application/json")
        ? await request.json()
        : Object.fromEntries((await request.formData()).entries());

    const parsed = siteSettingsSchema.safeParse(values);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });
    }

    const settings = await saveSiteSettings(parsed.data);

    if (contentType.includes("application/json")) {
      return NextResponse.json({ ok: true, settings });
    }

    return NextResponse.redirect(new URL("/admin/settings?site=saved", request.url), { status: 303 });
  } catch (error) {
    const authResponse = adminAuthErrorResponse(error);
    if (authResponse) return authResponse;
    const message = error instanceof Error ? error.message : "Failed to save site settings.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
