import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";
import { adminAuthErrorResponse, requireAdmin } from "@/lib/admin/auth";
import { invalidateAdminCache, invalidateContentCache } from "@/lib/cache/invalidation";
import { prisma } from "@/lib/db/prisma";

const projectSchema = z.object({
  id: z.string().trim().optional(),
  title: z.string().trim().min(1),
  slug: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i, "Slug 只能包含字母、数字和短横线。"),
  year: z.string().trim().optional().default(""),
  summary: z.string().trim().min(1),
  description: z.string().trim().optional().default(""),
  stack: z.string().trim().optional().default(""),
  cover: z.string().trim().optional().default(""),
  github: z.string().trim().optional().default(""),
  demo: z.string().trim().optional().default(""),
  docsUrl: z.string().trim().optional().default(""),
  sortOrder: z.coerce.number().int().default(0),
  featured: z.union([z.literal("on"), z.literal("true"), z.boolean()]).optional(),
  visible: z.union([z.literal("on"), z.literal("true"), z.boolean()]).optional()
});

function splitStack(value: string) {
  return value
    .split(/[\n,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function nullable(value: string) {
  return value.trim() || null;
}

function invalidateProjects() {
  invalidateAdminCache();
  invalidateContentCache();
  revalidateTag("projects");
  revalidatePath("/admin/projects");
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const values = Object.fromEntries((await request.formData()).entries());
    const parsed = projectSchema.safeParse(values);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });
    }

    const input = parsed.data;
    const data = {
      title: input.title,
      slug: input.slug,
      year: nullable(input.year),
      summary: input.summary,
      description: nullable(input.description),
      stack: splitStack(input.stack),
      cover: nullable(input.cover),
      github: nullable(input.github),
      demo: nullable(input.demo),
      docsUrl: nullable(input.docsUrl),
      sortOrder: input.sortOrder,
      featured: Boolean(input.featured),
      visible: Boolean(input.visible)
    };

    if (input.id) {
      await prisma.project.update({ where: { id: input.id }, data });
    } else {
      await prisma.project.create({ data });
    }

    invalidateProjects();
    return NextResponse.redirect(new URL("/admin/projects?saved=1", request.url), { status: 303 });
  } catch (error) {
    const authResponse = adminAuthErrorResponse(error);
    if (authResponse) return authResponse;
    const message = error instanceof Error ? error.message : "Project save failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
