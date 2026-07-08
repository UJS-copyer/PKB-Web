import "server-only";

import crypto from "node:crypto";
import path from "node:path";
import { put } from "@vercel/blob";

export type UploadPurpose = "avatar" | "resume" | "project-cover";

const purposeConfig: Record<UploadPurpose, { prefix: string; maxSize: number; types: string[] }> = {
  avatar: {
    prefix: "pkb/avatar",
    maxSize: 2 * 1024 * 1024,
    types: ["image/jpeg", "image/png", "image/webp"]
  },
  resume: {
    prefix: "pkb/resume",
    maxSize: 4 * 1024 * 1024,
    types: ["application/pdf"]
  },
  "project-cover": {
    prefix: "pkb/projects",
    maxSize: 4 * 1024 * 1024,
    types: ["image/jpeg", "image/png", "image/webp"]
  }
};

function safeExtension(fileName: string, contentType: string) {
  const ext = path.extname(fileName).toLowerCase();
  if (ext) return ext;
  if (contentType === "application/pdf") return ".pdf";
  if (contentType === "image/png") return ".png";
  if (contentType === "image/webp") return ".webp";
  return ".jpg";
}

function ensureBlobConfig() {
  if (process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    return;
  }

  if (process.env.BLOB_STORE_ID?.trim()) {
    return;
  }

  throw new Error(
    "Vercel Blob is not configured. Set BLOB_STORE_ID in Vercel, or BLOB_READ_WRITE_TOKEN for local development."
  );
}

function normalizeBlobUploadError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('OIDC is enabled for this project, but not for the "development" environment')) {
    return new Error(
      "Vercel Blob 当前只对 Production/Preview 启用了 OIDC。线上部署可以直接上传；本地开发请配置 BLOB_READ_WRITE_TOKEN，或在 Blob Store 项目连接中为 Development 启用当前项目。"
    );
  }

  return error instanceof Error ? error : new Error(message);
}

export async function uploadToBlob(file: File, purpose: UploadPurpose) {
  const config = purposeConfig[purpose];
  if (!config) {
    throw new Error("Unsupported upload purpose.");
  }
  if (!config.types.includes(file.type)) {
    throw new Error("Unsupported file type.");
  }
  if (file.size > config.maxSize) {
    throw new Error("File is too large.");
  }

  ensureBlobConfig();

  const ext = safeExtension(file.name, file.type);
  const pathname = `${config.prefix}/${Date.now()}-${crypto.randomUUID()}${ext}`;
  let blob;

  try {
    blob = await put(pathname, file, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: false
    });
  } catch (error) {
    throw normalizeBlobUploadError(error);
  }

  return {
    key: pathname,
    url: blob.url
  };
}
