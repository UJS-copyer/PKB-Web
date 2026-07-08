import type { Metadata } from "next";
import { KnowledgeShell } from "@/components/knowledge/knowledge-shell";

export const metadata: Metadata = {
  title: "知识库"
};

export const revalidate = 60;

type KnowledgePageProps = {
  searchParams?: Promise<{ q?: string; query?: string }>;
};

export default async function KnowledgePage({ searchParams }: KnowledgePageProps) {
  const params = await searchParams;
  const initialQuery = params?.q ?? params?.query ?? "";

  return (
    <main>
      <KnowledgeShell initialQuery={initialQuery} />
    </main>
  );
}
