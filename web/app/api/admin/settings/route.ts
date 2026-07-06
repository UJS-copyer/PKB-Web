import { NextResponse } from "next/server";
import { repositoryFormSchema, repositoryFromForm } from "@/lib/admin/repository";
import { getRepositoryConfig, saveRepositoryConfig } from "@/lib/admin/state-store";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  const values =
    contentType.includes("application/json")
      ? await request.json()
      : Object.fromEntries((await request.formData()).entries());

  const parsed = repositoryFormSchema.safeParse(values);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });
  }

  const previous = await getRepositoryConfig();
  const repository = repositoryFromForm(parsed.data, previous);
  await saveRepositoryConfig(repository);

  if (contentType.includes("application/json")) {
    return NextResponse.json({ ok: true, repository: { ...repository, tokenEncrypted: undefined } });
  }

  return NextResponse.redirect(new URL("/admin/settings?saved=1", request.url), { status: 303 });
}
