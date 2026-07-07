import type { Metadata } from "next";
import { AdminAiConfigActions } from "@/components/admin/admin-ai-config-actions";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getAiConfig, getAiConfigStatus } from "@/lib/ai/config";
import { getEmbeddingJobState } from "@/lib/rag/job-runner";

export const metadata: Metadata = {
  title: "AI Config"
};

export default async function AdminAiConfigPage() {
  const [config, status, embeddingJobState] = await Promise.all([getAiConfig(), getAiConfigStatus(), getEmbeddingJobState()]);

  return (
    <main>
      <AdminPageHeader
        eyebrow="Admin / AI"
        title="AI Config"
        description="配置 RAG 问答所需的模型、Embedding、检索参数和系统 Prompt。"
      />
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          {[
            ["Chat API", status.chatConfigured ? "Ready" : "Missing", "依赖 OPENAI_API_KEY，可配合 OPENAI_BASE_URL 使用中转"],
            ["Embedding API", status.embeddingConfigured ? "Ready" : "Missing", "依赖 EMBEDDING_API_KEY / EMBEDDING_BASE_URL"],
            ["Qdrant", status.qdrantConfigured ? "Ready" : "Missing", "依赖 QDRANT_URL / QDRANT_API_KEY"],
            ["Embeddings", String(status.chunkCount), `${status.noteCount} 篇有效笔记可用于向量化`]
          ].map(([label, value, hint], index) => (
            <Card key={`${label}-${index}`}>
              <CardHeader>
                <CardTitle className="text-base">{label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tracking-tight">{value}</p>
                <p className="mt-2 text-sm text-muted-foreground">{hint}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>RAG 参数</CardTitle>
          </CardHeader>
          <CardContent>
            <form action="/api/admin/ai-config" method="post" className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2 text-sm">
                <span className="text-muted-foreground">模型 Provider</span>
                <Input name="provider" defaultValue={config.provider} />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="text-muted-foreground">Chat 模型</span>
                <Input name="chatModel" defaultValue={config.chatModel} />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="text-muted-foreground">Embedding 模型</span>
                <Input name="embeddingModel" defaultValue={config.embeddingModel} />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="text-muted-foreground">Embedding 向量维度</span>
                <Input
                  name="embeddingDimensions"
                  type="number"
                  defaultValue={config.embeddingDimensions ? String(config.embeddingDimensions) : ""}
                  placeholder="例如 1024"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="text-muted-foreground">Chat Key / Base URL</span>
                <Input value={status.chatConfigured ? "已配置在服务端环境变量" : "未配置 OPENAI_API_KEY / OPENAI_BASE_URL"} disabled />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="text-muted-foreground">Embedding Key / Base URL</span>
                <Input
                  value={status.embeddingConfigured ? "已配置在服务端环境变量" : "未配置 EMBEDDING_API_KEY / EMBEDDING_BASE_URL"}
                  disabled
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="text-muted-foreground">Chunk Size</span>
                <Input name="chunkSize" type="number" defaultValue={String(config.chunkSize)} />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="text-muted-foreground">Overlap</span>
                <Input name="overlap" type="number" defaultValue={String(config.overlap)} />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="text-muted-foreground">TopK</span>
                <Input name="topK" type="number" defaultValue={String(config.topK)} />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="text-muted-foreground">Temperature</span>
                <Input name="temperature" type="number" step="0.1" defaultValue={String(config.temperature)} />
              </label>
              <label className="grid gap-2 text-sm md:col-span-2">
                <span className="text-muted-foreground">系统 Prompt</span>
                <Textarea
                  name="systemPrompt"
                  defaultValue={config.systemPrompt}
                  className="min-h-32"
                  placeholder="你是基于个人知识库回答问题的助手..."
                />
              </label>
              <AdminAiConfigActions latestJob={embeddingJobState.latestJob} />
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
