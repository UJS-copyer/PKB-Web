import "server-only";

import OpenAI from "openai";
import { prisma } from "@/lib/db/prisma";
import { getAiConfig, getEmbeddingProviderConfig } from "@/lib/ai/config";
import { getRuntimeCached } from "@/lib/cache/runtime-cache";
import { getAllNotes } from "@/lib/content/source";
import { getQdrantClient, qdrantCollection } from "@/lib/rag/qdrant";

export type RetrievedSource = {
  title: string;
  path: string;
  url: string;
  excerpt: string;
  score: number;
};

const retrievalCacheTtlMs = 10 * 60 * 1000;

function normalizeQuestion(question: string) {
  return question.trim().replace(/\s+/g, " ");
}

function scoreNote(question: string, text: string) {
  const terms = Array.from(new Set(question.toLowerCase().split(/\s+/).filter((term) => term.length > 1)));
  const haystack = text.toLowerCase();
  return terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
}

async function retrieveLocalSources(question: string, limit = 5): Promise<RetrievedSource[]> {
  const notes = await getAllNotes();
  return notes
    .map((note) => ({
      note,
      score: scoreNote(question, `${note.title}\n${note.excerpt}\n${note.tags.join(" ")}`)
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ note, score }) => ({
      title: note.title,
      path: note.relativePath,
      url: note.href,
      excerpt: note.excerpt,
      score
    }));
}

function getEmbeddingClient(config: { apiKey?: string; baseURL?: string }) {
  if (!config.apiKey) {
    throw new Error("Embedding API key is not configured.");
  }
  return new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });
}

async function retrieveVectorSources(question: string, limit: number): Promise<RetrievedSource[]> {
  const [config, chunkCount] = await Promise.all([getAiConfig(), prisma.embeddingChunk.count()]);
  const embeddingProvider = getEmbeddingProviderConfig(config);
  if (!process.env.QDRANT_URL || !process.env.QDRANT_API_KEY || !embeddingProvider.apiKey || chunkCount === 0) {
    return [];
  }

  const client = getEmbeddingClient(embeddingProvider);
  const embedding = await client.embeddings.create({
    model: embeddingProvider.model,
    ...(embeddingProvider.dimensions ? { dimensions: embeddingProvider.dimensions } : {}),
    input: question
  });

  const vector = embedding.data[0]?.embedding;
  if (!vector) return [];

  const qdrant = getQdrantClient();
  const results = await qdrant.search(qdrantCollection(), {
    vector,
    limit,
    with_payload: true
  });

  const deduped = new Map<string, RetrievedSource>();
  for (const result of results) {
    const payload = (result.payload ?? {}) as Record<string, unknown>;
    const path = typeof payload.sourcePath === "string" ? payload.sourcePath : "";
    if (!path) continue;

    const current = deduped.get(path);
    const score = typeof result.score === "number" ? result.score : 0;
    if (current && current.score >= score) continue;

    const slug = typeof payload.slug === "string" ? payload.slug : "";
    deduped.set(path, {
      title: typeof payload.title === "string" ? payload.title : path,
      path,
      url: slug ? `/knowledge/${slug.split("/").map(encodeURIComponent).join("/")}` : "#",
      excerpt: typeof payload.excerpt === "string" ? payload.excerpt : "",
      score
    });
  }

  return Array.from(deduped.values()).sort((a, b) => b.score - a.score).slice(0, limit);
}

export async function retrieveSources(question: string, limit?: number): Promise<RetrievedSource[]> {
  const config = await getAiConfig();
  const topK = limit ?? config.topK;
  const normalizedQuestion = normalizeQuestion(question);
  if (!normalizedQuestion) return [];

  return getRuntimeCached(`rag:sources:${topK}:${normalizedQuestion.toLowerCase()}`, retrievalCacheTtlMs, async () => {
    const vectorSources = await retrieveVectorSources(normalizedQuestion, topK);
    if (vectorSources.length > 0) return vectorSources;
    return retrieveLocalSources(normalizedQuestion, topK);
  });
}

export function buildRagPrompt(question: string, sources: RetrievedSource[], systemPrompt: string) {
  const context = sources
    .map(
      (source, index) =>
        `Source ${index + 1}: ${source.title}\nPath: ${source.path}\nURL: ${source.url}\nExcerpt: ${source.excerpt}`
    )
    .join("\n\n");

  return `${systemPrompt}

用户问题：
${question}

知识库来源：
${context || "未检索到足够来源。"}

回答要求：
1. 优先依据来源回答，不要编造不存在于知识库中的事实。
2. 如果来源不足，明确指出不确定或缺失。
3. 回答尽量使用 Markdown。
4. 在回答末尾给出一个“参考来源”小节，列出你实际使用到的来源标题。`;
}
