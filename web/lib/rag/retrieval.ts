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

function tokenizeQuestion(question: string) {
  const normalized = normalizeQuestion(question).toLowerCase();
  const tokens = new Set<string>();

  for (const match of normalized.match(/[a-z0-9][a-z0-9._/-]*/g) ?? []) {
    if (match.length > 1) tokens.add(match);
  }

  for (const segment of normalized.match(/[\u4e00-\u9fff]{2,}/g) ?? []) {
    if (segment.length <= 6) {
      tokens.add(segment);
    }
    for (let size = 2; size <= Math.min(4, segment.length); size += 1) {
      for (let index = 0; index <= segment.length - size; index += 1) {
        tokens.add(segment.slice(index, index + size));
      }
    }
  }

  return Array.from(tokens).slice(0, 80);
}

function scoreText(tokens: string[], text: string) {
  const haystack = text.toLowerCase();
  return tokens.reduce((score, token) => {
    if (!token) return score;
    if (haystack === token) return score + 6;
    if (haystack.startsWith(token) || haystack.endsWith(token)) return score + 4;
    if (haystack.includes(token)) return score + Math.max(2, token.length >= 4 ? 4 : 2);
    return score;
  }, 0);
}

async function retrieveLocalSources(question: string, limit = 5): Promise<RetrievedSource[]> {
  const notes = await getAllNotes();
  const tokens = tokenizeQuestion(question);
  return notes
    .map((note) => {
      const titleScore = scoreText(tokens, `${note.title}\n${note.aliases.join(" ")}\n${note.slug}`);
      const pathScore = scoreText(tokens, note.relativePath);
      const tagScore = scoreText(tokens, note.tags.join(" "));
      const excerptScore = scoreText(tokens, note.excerpt);
      return {
        note,
        score: titleScore * 5 + pathScore * 3 + tagScore * 2 + excerptScore
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.note.title.localeCompare(b.note.title, "zh-CN"))
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

  const paths = results
    .map((result) => {
      const payload = (result.payload ?? {}) as Record<string, unknown>;
      return typeof payload.sourcePath === "string" ? payload.sourcePath : "";
    })
    .filter(Boolean);
  const publicRows =
    paths.length > 0
      ? await prisma.note.findMany({
          where: { status: "active", visibility: "public", sourcePath: { in: paths } },
          select: { sourcePath: true }
        })
      : [];
  const publicPaths = new Set(publicRows.map((row) => row.sourcePath));

  const deduped = new Map<string, RetrievedSource>();
  for (const result of results) {
    const payload = (result.payload ?? {}) as Record<string, unknown>;
    const path = typeof payload.sourcePath === "string" ? payload.sourcePath : "";
    if (!path || !publicPaths.has(path)) continue;

    const current = deduped.get(path);
    const score = typeof result.score === "number" ? result.score : 0;
    if (current && current.score >= score) continue;

    const slug = typeof payload.slug === "string" ? payload.slug : "";
    const excerpt =
      typeof payload.excerpt === "string" && payload.excerpt.trim()
        ? payload.excerpt
        : typeof payload.content === "string"
          ? payload.content.slice(0, 260)
          : "";
    deduped.set(path, {
      title: typeof payload.title === "string" ? payload.title : path,
      path,
      url: slug ? `/knowledge/${slug.split("/").map(encodeURIComponent).join("/")}` : "#",
      excerpt,
      score
    });
  }

  return Array.from(deduped.values()).sort((a, b) => b.score - a.score).slice(0, limit);
}

function mergeRetrievedSources(localSources: RetrievedSource[], vectorSources: RetrievedSource[], limit: number) {
  const merged = new Map<string, RetrievedSource>();

  for (const source of localSources) {
    merged.set(source.path, {
      ...source,
      score: source.score + 100
    });
  }

  for (const source of vectorSources) {
    const current = merged.get(source.path);
    const boosted = {
      ...source,
      score: source.score * 10
    };
    if (!current || boosted.score > current.score) {
      merged.set(source.path, boosted);
    }
  }

  return Array.from(merged.values())
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, "zh-CN"))
    .slice(0, limit);
}

export async function retrieveSources(question: string, limit?: number): Promise<RetrievedSource[]> {
  const config = await getAiConfig();
  const topK = limit ?? config.topK;
  const normalizedQuestion = normalizeQuestion(question);
  if (!normalizedQuestion) return [];

  return getRuntimeCached(`rag:sources:${topK}:${normalizedQuestion.toLowerCase()}`, retrievalCacheTtlMs, async () => {
    const localSources = await retrieveLocalSources(normalizedQuestion, topK);
    const vectorSources = await retrieveVectorSources(normalizedQuestion, topK);
    if (vectorSources.length === 0) return localSources;
    return mergeRetrievedSources(localSources, vectorSources, topK);
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
