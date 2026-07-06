import "server-only";

import { put } from "@vercel/blob";

export async function uploadAssetToBlob(pathname: string, body: Buffer, contentType?: string) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not configured.");
  }

  return put(pathname, body, {
    access: "public",
    contentType
  });
}
