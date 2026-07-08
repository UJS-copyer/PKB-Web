import "server-only";

import { cache } from "react";
import { invalidateAdminCache, invalidateContentCache } from "@/lib/cache/invalidation";
import { getRuntimeCached } from "@/lib/cache/runtime-cache";
import { databaseConfigured, prisma } from "@/lib/db/prisma";

export type AiRuntimeConfig = {
  provider: string;
  chatModel: string;
  embeddingModel: string;
  embeddingDimensions?: number;
  chunkSize: number;
  overlap: number;
  topK: number;
  temperature: number;
  systemPrompt: string;
};

export type AiConfigStatus = {
  chatConfigured: boolean;
  embeddingConfigured: boolean;
  qdrantConfigured: boolean;
  chunkCount: number;
  noteCount: number;
  chatEndpoint: string;
  embeddingEndpoint: string;
  rateLimitLabel: string;
  warnings: string[];
};

export function supportsTemperature(model: string) {
  const normalized = model.trim().toLowerCase();
  if (!normalized) return true;
  return !/^gpt-5(?:[.-]|$)/.test(normalized) && !/^o[134](?:[.-]|$)/.test(normalized);
}

type AiConfigLike = {
  provider?: string | null;
  chatModel?: string | null;
  embeddingModel?: string | null;
  embeddingDimensions?: number | null;
  chunkSize?: number | null;
  overlap?: number | null;
  topK?: number | null;
  temperature?: number | null;
  systemPrompt?: string | null;
};

const defaultAiConfig: AiRuntimeConfig = {
  provider: "openai",
  chatModel: process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini",
  embeddingModel: process.env.EMBEDDING_MODEL ?? "text-embedding-v4",
  embeddingDimensions:
    process.env.EMBEDDING_DIMENSIONS && Number(process.env.EMBEDDING_DIMENSIONS) > 0
      ? Number(process.env.EMBEDDING_DIMENSIONS)
      : 1024,
  chunkSize: 900,
  overlap: 120,
  topK: 6,
  temperature: 0.2,
  systemPrompt: "你是基于个人知识库回答问题的助手。必须基于引用来源回答。"
};

function normalizeAiConfig(value?: AiConfigLike | null): AiRuntimeConfig {
  return {
    provider: value?.provider?.trim() || defaultAiConfig.provider,
    chatModel: value?.chatModel?.trim() || defaultAiConfig.chatModel,
    embeddingModel: value?.embeddingModel?.trim() || defaultAiConfig.embeddingModel,
    embeddingDimensions:
      value?.embeddingDimensions && value.embeddingDimensions > 0 ? value.embeddingDimensions : defaultAiConfig.embeddingDimensions,
    chunkSize: value?.chunkSize && value.chunkSize > 200 ? value.chunkSize : defaultAiConfig.chunkSize,
    overlap:
      value?.overlap && value.overlap >= 0 && value.overlap < (value.chunkSize ?? defaultAiConfig.chunkSize)
        ? value.overlap
        : defaultAiConfig.overlap,
    topK: value?.topK && value.topK > 0 ? value.topK : defaultAiConfig.topK,
    temperature:
      typeof value?.temperature === "number" && value.temperature >= 0 && value.temperature <= 2
        ? value.temperature
        : defaultAiConfig.temperature,
    systemPrompt: value?.systemPrompt?.trim() || defaultAiConfig.systemPrompt
  };
}

export const getAiConfig = cache(async (): Promise<AiRuntimeConfig> => {
  return getRuntimeCached("ai:config", 60 * 1000, async () => {
    if (!databaseConfigured()) return defaultAiConfig;

    try {
      const row = await prisma.aiConfig.findUnique({ where: { id: "singleton" } });
      return normalizeAiConfig(row);
    } catch {
      return defaultAiConfig;
    }
  });
});

export async function getAiConfigStatus(): Promise<AiConfigStatus> {
  return getRuntimeCached("ai:status", 30 * 1000, async () => {
    if (!databaseConfigured()) {
      return {
        chatConfigured: Boolean(process.env.OPENAI_API_KEY),
        embeddingConfigured: Boolean(process.env.EMBEDDING_API_KEY ?? process.env.OPENAI_API_KEY),
        qdrantConfigured: Boolean(process.env.QDRANT_URL && process.env.QDRANT_API_KEY),
        chunkCount: 0,
        noteCount: 0,
        chatEndpoint: process.env.OPENAI_BASE_URL?.trim() || "官方默认端点",
        embeddingEndpoint: process.env.EMBEDDING_BASE_URL?.trim() || process.env.OPENAI_BASE_URL?.trim() || "官方默认端点",
        rateLimitLabel: "每个 IP 10 分钟最多 20 次对话请求",
        warnings: buildAiWarnings()
      };
    }

    const [chunkCount, noteCount] = await Promise.all([
      prisma.embeddingChunk.count(),
      prisma.note.count({ where: { status: "active" } })
    ]);

    return {
      chatConfigured: Boolean(process.env.OPENAI_API_KEY),
      embeddingConfigured: Boolean(process.env.EMBEDDING_API_KEY ?? process.env.OPENAI_API_KEY),
      qdrantConfigured: Boolean(process.env.QDRANT_URL && process.env.QDRANT_API_KEY),
      chunkCount,
      noteCount,
      chatEndpoint: process.env.OPENAI_BASE_URL?.trim() || "官方默认端点",
      embeddingEndpoint: process.env.EMBEDDING_BASE_URL?.trim() || process.env.OPENAI_BASE_URL?.trim() || "官方默认端点",
      rateLimitLabel: "每个 IP 10 分钟最多 20 次对话请求",
      warnings: buildAiWarnings()
    };
  });
}

function buildAiWarnings() {
  const warnings: string[] = [];

  if (!process.env.OPENAI_API_KEY) {
    warnings.push("未配置聊天 API Key，前台 AI 将只能返回降级提示。");
  }

  if (!process.env.EMBEDDING_API_KEY && !process.env.OPENAI_API_KEY) {
    warnings.push("未配置 Embedding API Key，向量检索与重建会失败。");
  }

  if (!process.env.QDRANT_URL || !process.env.QDRANT_API_KEY) {
    warnings.push("Qdrant 连接信息不完整，RAG 检索无法正常工作。");
  }

  if (process.env.OPENAI_BASE_URL && !process.env.OPENAI_API_KEY) {
    warnings.push("已填写聊天中转地址，但缺少对应 API Key。");
  }

  if (process.env.EMBEDDING_BASE_URL && !process.env.EMBEDDING_API_KEY && !process.env.OPENAI_API_KEY) {
    warnings.push("已填写 Embedding 中转地址，但缺少可用 API Key。");
  }

  if (!supportsTemperature(process.env.OPENAI_CHAT_MODEL?.trim() || defaultAiConfig.chatModel)) {
    warnings.push("当前聊天模型属于推理模型，temperature 参数不会生效，系统会自动忽略该参数。");
  }

  return warnings;
}

export async function saveAiConfig(input: AiRuntimeConfig) {
  if (!databaseConfigured()) {
    throw new Error("Database is required to save AI config.");
  }

  const data = normalizeAiConfig(input);
  const row = await prisma.aiConfig.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...data },
    update: data
  });

  invalidateAdminCache();
  invalidateContentCache();
  return normalizeAiConfig(row);
}

export function getChatProviderConfig() {
  return {
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL?.trim() || undefined,
    model: process.env.OPENAI_CHAT_MODEL?.trim() || undefined
  };
}

export function getEmbeddingProviderConfig(config?: Pick<AiRuntimeConfig, "embeddingModel" | "embeddingDimensions">) {
  const model = config?.embeddingModel?.trim() || process.env.EMBEDDING_MODEL?.trim() || defaultAiConfig.embeddingModel;
  const dimensions =
    config?.embeddingDimensions ??
    (process.env.EMBEDDING_DIMENSIONS && Number(process.env.EMBEDDING_DIMENSIONS) > 0
      ? Number(process.env.EMBEDDING_DIMENSIONS)
      : defaultAiConfig.embeddingDimensions);

  return {
    apiKey: process.env.EMBEDDING_API_KEY?.trim() || process.env.OPENAI_API_KEY,
    baseURL: process.env.EMBEDDING_BASE_URL?.trim() || process.env.OPENAI_BASE_URL?.trim() || undefined,
    model,
    dimensions
  };
}
