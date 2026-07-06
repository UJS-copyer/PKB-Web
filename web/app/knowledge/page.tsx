import type { Metadata } from "next";
import { KnowledgeShell } from "@/components/knowledge/knowledge-shell";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "Knowledge"
};

export const revalidate = 60;

export default function KnowledgePage() {
  return (
    <main>
      <PageHeader
        eyebrow="Knowledge"
        title="Obsidian 驱动的知识库"
        description="目录、链接、反向引用、搜索和图谱都从同一份 Vault 中派生。"
      />
      <KnowledgeShell />
    </main>
  );
}
