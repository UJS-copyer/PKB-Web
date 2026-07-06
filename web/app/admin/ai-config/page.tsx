import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const metadata: Metadata = {
  title: "AI Config"
};

export default function AdminAiConfigPage() {
  return (
    <main>
      <AdminPageHeader
        eyebrow="Admin / AI"
        title="AI Config"
        description="配置 RAG 问答所需的模型、Embedding、检索参数和系统 Prompt。"
      />
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>RAG 参数</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            {[
              "模型 Provider",
              "API Key",
              "Embedding 模型",
              "Chunk Size",
              "Overlap",
              "TopK",
              "Temperature"
            ].map((field) => (
              <label key={field} className="grid gap-2 text-sm">
                <span className="text-muted-foreground">{field}</span>
                <Input placeholder={field} type={field === "API Key" ? "password" : "text"} />
              </label>
            ))}
            <label className="grid gap-2 text-sm md:col-span-2">
              <span className="text-muted-foreground">系统 Prompt</span>
              <Textarea placeholder="你是基于个人知识库回答问题的助手..." />
            </label>
            <div className="md:col-span-2 flex justify-end gap-3">
              <Button variant="outline">重新 Embedding</Button>
              <Button>保存配置</Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
