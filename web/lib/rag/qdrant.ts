import "server-only";

import { QdrantClient } from "@qdrant/js-client-rest";

export function getQdrantClient() {
  if (!process.env.QDRANT_URL || !process.env.QDRANT_API_KEY) {
    throw new Error("Qdrant is not configured.");
  }

  return new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY
  });
}

export function qdrantCollection() {
  return process.env.QDRANT_COLLECTION ?? "pkb_knowledge_v1";
}
