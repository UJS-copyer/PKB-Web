import "server-only";

import { put } from "@vercel/blob";

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

export async function uploadAssetToBlob(pathname: string, body: Buffer, contentType?: string) {
  ensureBlobConfig();

  return put(pathname, body, {
    access: "public",
    contentType
  });
}
