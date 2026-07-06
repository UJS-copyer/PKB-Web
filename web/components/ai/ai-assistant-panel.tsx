"use client";

import { useState } from "react";
import { SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ragSources } from "@/lib/sample-data";

export function AiAssistantPanel() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!question.trim()) return;
    setLoading(true);
    setAnswer("");

    const response = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question })
    });

    if (!response.body) {
      setLoading(false);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      setAnswer((current) => current + decoder.decode(value));
    }
    setLoading(false);
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
              <div className="whitespace-pre-wrap text-sm leading-7 text-foreground">{answer}</div>
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
                {loading ? "Thinking..." : "发送"}
                <SendHorizontal className="size-4" />
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
            {ragSources.map((source, index) => (
              <div key={source} className="rounded-md border border-border p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
                  Source {index + 1}
                </p>
                <p className="mt-2 break-all text-xs leading-5 text-muted-foreground">{source}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
