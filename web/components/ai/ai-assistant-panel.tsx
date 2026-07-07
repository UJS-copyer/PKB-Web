"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MarkdownView } from "@/components/markdown/markdown-view";
import { Textarea } from "@/components/ui/textarea";

type RagSource = {
  title: string;
  path: string;
  url: string;
  excerpt: string;
  score: number;
};

export function AiAssistantPanel() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<RagSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!question.trim()) return;
    setLoading(true);
    setAnswer("");
    setSources([]);
    setError(null);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question })
      });

      if (!response.ok) {
        throw new Error(`请求失败：${response.status}`);
      }

      const header = response.headers.get("X-RAG-Sources");
      if (header) {
        try {
          setSources(JSON.parse(decodeURIComponent(header)) as RagSource[]);
        } catch {
          setSources([]);
        }
      }

      if (!response.body) {
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setAnswer((current) => current + decoder.decode(value));
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "问答请求失败。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_280px] lg:px-8">
      <Card className="min-h-[560px] bg-card/50">
        <CardHeader>
          <CardTitle>Ask your knowledge base.</CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-[460px] flex-col gap-4">
          <div className="flex-1 rounded-lg border border-border bg-background/60 p-5">
            {answer ? (
              <div className="space-y-3">
                {loading && (
                  <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/5 px-3 py-1 text-xs text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin text-accent" />
                    正在继续生成回答...
                  </div>
                )}
                <div className="garden-prose text-sm">
                  <MarkdownView content={answer} />
                </div>
              </div>
            ) : loading ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
                <Loader2 className="size-6 animate-spin text-accent" />
                <div className="space-y-1">
                  <p>正在检索知识库并生成回答...</p>
                  <p className="text-xs text-muted-foreground/80">当前问题会做一次查询向量化，相同问题的检索结果会命中短时缓存。</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex h-full items-center justify-center text-center text-sm text-destructive">
                {error}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                输入一个关于知识库的问题。回答会以 RAG 形式返回，并附带来源引用。
              </div>
            )}
          </div>
          <div className="grid gap-3">
            <Textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="请输入你的问题..."
              className="min-h-28 resize-none"
            />
            <div className="flex justify-end">
              <Button onClick={submit} disabled={loading || !question.trim()}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : <SendHorizontal className="size-4" />}
                {loading ? "生成中..." : "发送"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <aside className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">引用来源</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sources.length > 0 ? (
              sources.map((source, index) => (
                <div key={`${source.path}-${index}`} className="rounded-md border border-border p-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
                    Source {index + 1}
                  </p>
                  <Link href={source.url} className="mt-2 block text-sm font-medium transition-colors hover:text-accent">
                    {source.title}
                  </Link>
                  <p className="mt-2 break-all text-xs leading-5 text-muted-foreground">{source.path}</p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{source.excerpt}</p>
                </div>
              ))
            ) : loading ? (
              <div className="rounded-md border border-accent/20 bg-accent/5 p-3 text-xs leading-6 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Loader2 className="size-3.5 animate-spin text-accent" />
                  <span>正在整理引用来源...</span>
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-border p-3 text-xs leading-6 text-muted-foreground">
                发送问题后，这里会显示参与回答的知识库来源。
              </div>
            )}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
