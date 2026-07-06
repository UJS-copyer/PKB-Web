import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getRepositoryConfig } from "@/lib/admin/state-store";
import { GiteeRepositoryAdapter } from "@/lib/gitee/client";

const mimeTypes: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".tif": "image/tiff",
  ".tiff": "image/tiff"
};

function vaultRoot() {
  return path.resolve(process.env.OBSIDIAN_VAULT_PATH ?? path.join(process.cwd(), "..", "obsidian"));
}

export async function GET(_: Request, context: { params: Promise<{ path: string[] }> }) {
  const params = await context.params;
  const sourcePath = params.path.join("/");
  if (params.path.some((segment) => segment === "..")) {
    return new NextResponse("Invalid asset path", { status: 400 });
  }

  const root = vaultRoot();
  const requested = path.resolve(root, ...params.path);

  if (!requested.startsWith(root)) {
    return new NextResponse("Invalid asset path", { status: 400 });
  }

  try {
    const file = await fs.readFile(requested);
    const ext = path.extname(requested).toLowerCase();
    return new NextResponse(file, {
      headers: {
        "Content-Type": mimeTypes[ext] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    });
  } catch {
    try {
      const config = await getRepositoryConfig();
      const adapter = new GiteeRepositoryAdapter(config);
      const file = await adapter.getFileBuffer(sourcePath);
      const ext = path.extname(sourcePath).toLowerCase();
      return new NextResponse(new Uint8Array(file.buffer), {
        headers: {
          "Content-Type": mimeTypes[ext] ?? "application/octet-stream",
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400"
        }
      });
    } catch {
      return new NextResponse("Asset not found", { status: 404 });
    }
  }
}
