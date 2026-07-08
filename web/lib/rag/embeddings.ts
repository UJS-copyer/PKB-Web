import "server-only";

import OpenAI from "openai";
import { prisma } from "@/lib/db/prisma";
import { getAiConfig, getEmbeddingProviderConfig } from "@/lib/ai/config";
import { qdrantCollection, getQdrantClient } from "@/lib/rag/qdrant";
import { buildNoteChunks } from "@/lib/rag/chunks";
import { invalidateAdminCache, invalidateContentCache } from "@/lib/cache/invalidation";

type EmbeddedPoint = {
  id: string;
  vector: number[];
  payload: {
    noteId: string;
    sourcePath: string;
    slug: string;
    title: string;
    excerpt: string;
    visibility: string;
    chunkIndex: number;
    content: string;
  };
};

type EmbeddingSourceNote = {
  id: string;
  sourcePath: string;
  slug: string;
  title: string;
  content: string;
  excerpt?: string | null;
  visibility?: string | null;
};

export type EmbeddingNoteChange = {
  id: string;
  sourcePath: string;
  slug: string;
  title: string;
  content: string;
  excerpt?: string | null;
  visibility?: string | null;
};

function qdrantPointIdFromHash(hash: string) {
  const chars = hash
    .replace(/[^a-f0-9]/gi, "")
    .toLowerCase()
    .padEnd(32, "0")
    .slice(0, 32)
    .split("");

  chars[12] = "4";
  chars[16] = "8";

  return `${chars.slice(0, 8).join("")}-${chars.slice(8, 12).join("")}-${chars.slice(12, 16).join("")}-${chars.slice(16, 20).join("")}-${chars.slice(20, 32).join("")}`;
}

function getEmbeddingClient(config: { apiKey?: string; baseURL?: string }) {
  if (!config.apiKey) {
    throw new Error("Embedding API key is not configured.");
  }
  return new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });
}

async function ensureCollection(vectorSize: number, reset = false) {
  const client = getQdrantClient();
  const collection = qdrantCollection();
  const collections = await client.getCollections();
  const exists = collections.collections.some((item) => item.name === collection);

  if (exists && reset) {
    await client.deleteCollection(collection);
  }

  if (!exists || reset) {
    await client.createCollection(collection, {
      vectors: {
        size: vectorSize,
        distance: "Cosine"
      }
    });
  }
}

async function embedBatch(
  client: OpenAI,
  config: {
    model: string;
    dimensions?: number;
  },
  input: string[]
) {
  const response = await client.embeddings.create({
    model: config.model,
    ...(config.dimensions ? { dimensions: config.dimensions } : {}),
    input
  });

  return response.data.map((item) => item.embedding);
}

async function getExistingChunksBySourcePaths(sourcePaths: string[]) {
  if (sourcePaths.length === 0) return [];
  return prisma.embeddingChunk.findMany({
    where: { sourcePath: { in: sourcePaths } },
    select: {
      sourcePath: true,
      chunkIndex: true,
      contentHash: true,
      qdrantPointId: true
    }
  });
}

async function deleteChunksBySourcePaths(sourcePaths: string[]) {
  if (sourcePaths.length === 0) return;

  const existingChunks = await getExistingChunksBySourcePaths(sourcePaths);

  if (existingChunks.length > 0) {
    const client = getQdrantClient();
    await client.delete(qdrantCollection(), {
      wait: true,
      filter: {
        must: [
          {
            key: "sourcePath",
            match: {
              any: sourcePaths
            }
          }
        ]
      }
    });
  }

  await prisma.embeddingChunk.deleteMany({
    where: { sourcePath: { in: sourcePaths } }
  });
}

async function upsertChunksForNotes(notes: EmbeddingSourceNote[]) {
  const config = await getAiConfig();
  const embeddingProvider = getEmbeddingProviderConfig(config);
  const openai = getEmbeddingClient(embeddingProvider);

  const chunks = notes.flatMap((note) =>
    buildNoteChunks(
      {
        noteId: note.id,
        sourcePath: note.sourcePath,
        slug: note.slug,
        title: note.title,
        content: note.content,
        excerpt: note.excerpt
      },
      config.chunkSize,
      config.overlap
    )
  );

  if (chunks.length === 0) {
    await deleteChunksBySourcePaths(notes.map((note) => note.sourcePath));
    return { notes: notes.length, chunks: 0, deleted: notes.length };
  }

  const firstEmbedding = await embedBatch(openai, embeddingProvider, [chunks[0].content]);
  const vectorSize = firstEmbedding[0].length;
  const client = getQdrantClient();
  const collection = qdrantCollection();
  const collections = await client.getCollections();
  const exists = collections.collections.some((item) => item.name === collection);

  if (!exists) {
    await client.createCollection(collection, {
      vectors: {
        size: vectorSize,
        distance: "Cosine"
      }
    });
  }

  const sourcePaths = notes.map((note) => note.sourcePath);
  await deleteChunksBySourcePaths(sourcePaths);

  const points: EmbeddedPoint[] = [];
  points.push({
    id: qdrantPointIdFromHash(chunks[0].contentHash),
    vector: firstEmbedding[0],
    payload: {
      noteId: chunks[0].noteId,
      sourcePath: chunks[0].sourcePath,
      slug: chunks[0].slug,
      title: chunks[0].title,
      excerpt: chunks[0].excerpt,
      visibility: "public",
      chunkIndex: chunks[0].chunkIndex,
      content: chunks[0].content
    }
  });

  const batchSize = 10;
  for (let index = 1; index < chunks.length; index += batchSize) {
    const batch = chunks.slice(index, index + batchSize);
    const vectors = await embedBatch(
      openai,
      embeddingProvider,
      batch.map((item) => item.content)
    );

    batch.forEach((chunk, offset) => {
      points.push({
        id: qdrantPointIdFromHash(chunk.contentHash),
        vector: vectors[offset],
        payload: {
          noteId: chunk.noteId,
          sourcePath: chunk.sourcePath,
          slug: chunk.slug,
          title: chunk.title,
          excerpt: chunk.excerpt,
          visibility: "public",
          chunkIndex: chunk.chunkIndex,
          content: chunk.content
        }
      });
    });
  }

  for (let index = 0; index < points.length; index += 64) {
    await client.upsert(collection, {
      wait: true,
      points: points.slice(index, index + 64)
    });
  }

  await prisma.embeddingChunk.createMany({
    data: chunks.map((chunk) => ({
      noteId: chunk.noteId,
      sourcePath: chunk.sourcePath,
      chunkIndex: chunk.chunkIndex,
      heading: null,
      content: chunk.content,
      contentHash: chunk.contentHash,
      qdrantPointId: qdrantPointIdFromHash(chunk.contentHash)
    }))
  });

  invalidateAdminCache();
  invalidateContentCache();
  return { notes: notes.length, chunks: chunks.length, deleted: notes.length };
}

export async function rebuildEmbeddings() {
  const config = await getAiConfig();
  const embeddingProvider = getEmbeddingProviderConfig(config);
  const openai = getEmbeddingClient(embeddingProvider);
  const notes = await prisma.note.findMany({
    where: { status: "active", visibility: "public" },
    select: {
      id: true,
      sourcePath: true,
      slug: true,
      title: true,
      content: true,
      excerpt: true
    },
    orderBy: { sourcePath: "asc" }
  });

  const chunks = notes.flatMap((note) =>
    buildNoteChunks(
      {
        noteId: note.id,
        sourcePath: note.sourcePath,
        slug: note.slug,
        title: note.title,
        content: note.content,
        excerpt: note.excerpt
      },
      config.chunkSize,
      config.overlap
    )
  );

  if (chunks.length === 0) {
    await prisma.embeddingChunk.deleteMany({});
    invalidateAdminCache();
    invalidateContentCache();
    return { notes: notes.length, chunks: 0 };
  }

  const firstEmbedding = await embedBatch(openai, embeddingProvider, [chunks[0].content]);
  await ensureCollection(firstEmbedding[0].length, true);

  const client = getQdrantClient();
  const collection = qdrantCollection();
  await prisma.embeddingChunk.deleteMany({});

  const points: EmbeddedPoint[] = [
    {
      id: qdrantPointIdFromHash(chunks[0].contentHash),
      vector: firstEmbedding[0],
      payload: {
        noteId: chunks[0].noteId,
        sourcePath: chunks[0].sourcePath,
        slug: chunks[0].slug,
        title: chunks[0].title,
        excerpt: chunks[0].excerpt,
        visibility: "public",
        chunkIndex: chunks[0].chunkIndex,
        content: chunks[0].content
      }
    }
  ];

  // Bailian's text-embedding-v4 compatible endpoint accepts at most 10 inputs per request.
  // Keep the batch size conservative so a single provider switch does not break rebuilds.
  const batchSize = 10;
  for (let index = 1; index < chunks.length; index += batchSize) {
    const batch = chunks.slice(index, index + batchSize);
    const vectors = await embedBatch(
      openai,
      embeddingProvider,
      batch.map((item) => item.content)
    );

    batch.forEach((chunk, offset) => {
      points.push({
        id: qdrantPointIdFromHash(chunk.contentHash),
        vector: vectors[offset],
        payload: {
          noteId: chunk.noteId,
          sourcePath: chunk.sourcePath,
          slug: chunk.slug,
          title: chunk.title,
          excerpt: chunk.excerpt,
          visibility: "public",
          chunkIndex: chunk.chunkIndex,
          content: chunk.content
        }
      });
    });
  }

  for (let index = 0; index < points.length; index += 64) {
    await client.upsert(collection, {
      wait: true,
      points: points.slice(index, index + 64)
    });
  }

  await prisma.embeddingChunk.createMany({
    data: chunks.map((chunk) => ({
      noteId: chunk.noteId,
      sourcePath: chunk.sourcePath,
      chunkIndex: chunk.chunkIndex,
      heading: null,
      content: chunk.content,
      contentHash: chunk.contentHash,
      qdrantPointId: qdrantPointIdFromHash(chunk.contentHash)
    }))
  });

  invalidateAdminCache();
  invalidateContentCache();
  return {
    notes: notes.length,
    chunks: chunks.length
  };
}

export async function syncEmbeddingsForNotes(notes: EmbeddingSourceNote[]) {
  if (notes.length === 0) {
    return { notes: 0, chunks: 0, deleted: 0 };
  }

  const publicNotes = notes.filter((note) => (note.visibility ?? "public") === "public");
  const hiddenPaths = notes
    .filter((note) => (note.visibility ?? "public") !== "public")
    .map((note) => note.sourcePath);

  if (hiddenPaths.length > 0) {
    await deleteChunksBySourcePaths(hiddenPaths);
  }

  if (publicNotes.length === 0) {
    invalidateAdminCache();
    invalidateContentCache();
    return { notes: 0, chunks: 0, deleted: hiddenPaths.length };
  }

  const result = await upsertChunksForNotes(publicNotes);
  return { ...result, deleted: result.deleted + hiddenPaths.length };
}

export async function deleteEmbeddingsForPaths(sourcePaths: string[]) {
  await deleteChunksBySourcePaths(sourcePaths);
  invalidateAdminCache();
  invalidateContentCache();
}
