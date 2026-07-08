import type { Metadata } from "next";
import { AiAssistantPanel } from "@/components/ai/ai-assistant-panel";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "AI 助手"
};

export default function AiPage() {
  return (
    <main>
      <PageHeader
        eyebrow="AI"
        title="向你的知识库提问"
        description="整个 AI 页面只做一件事：基于 Knowledge 的 RAG 问答。"
      />
      <AiAssistantPanel />
    </main>
  );
}
