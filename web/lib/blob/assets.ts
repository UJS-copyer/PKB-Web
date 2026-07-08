import "server-only";

import { put } from "@vercel/blob";

function ensureBlobConfig() {
  if (process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    return;
  }

  if (process.env.BLOB_STORE_ID?.trim() && process.env.VERCEL_OIDC_TOKEN?.trim()) {
    return;
  }

  throw new Error(
    "Vercel Blob is not configured. For local development, set BLOB_READ_WRITE_TOKEN. In Vercel, connect the Blob store so BLOB_STORE_ID and OIDC are available."
  );
}

export async function uploadAssetToBlob(pathname: string, body: Buffer, contentType?: string) {
  ensureBlobConfig();

  return put(pathname, body, {
    access: "public",
    contentType
  });
}
