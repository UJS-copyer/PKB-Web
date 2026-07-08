"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, SendHorizontal } from "lucide-react";
import { MarkdownView } from "@/components/markdown/markdown-view";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type RagSource = {
  title: string;
  path: string;
  url: string;
  excerpt: string;
  score: number;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: RagSource[];
};

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function AiAssistantPanel() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const apiMessages = useMemo(
    () => messages.map((message) => ({ role: message.role, content: message.content })),
    [messages]
  );

  async function submit() {
    const question = input.trim();
    if (!question || loading) return;

    const userMessage: ChatMessage = { id: createId(), role: "user", content: question };
    const assistantId = createId();
    const assistantMessage: ChatMessage = { id: assistantId, role: "assistant", content: "" };
    const nextMessages = [...messages, userMessage, assistantMessage];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...apiMessages, { role: "user", content: question }]
        })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? `请求失败：${response.status}`);
      }

      let sources: RagSource[] = [];
      const header = response.headers.get("X-RAG-Sources");
      if (header) {
        try {
          sources = JSON.parse(decodeURIComponent(header)) as RagSource[];
        } catch {
          sources = [];
        }
      }

      if (!response.body) return;
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId
              ? { ...message, content: `${message.content}${chunk}`, sources }
              : message
          )
        );
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "问答请求失败。");
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId ? { ...message, content: "抱歉，这次请求失败了。请稍后再试。" } : message
        )
      );
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function reset() {
    setMessages([]);
    setInput("");
    setError(null);
    inputRef.current?.focus();
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-5xl flex-col px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">RAG Assistant</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">向你的知识库提问</h1>
        </div>
        <Button variant="outline" size="sm" onClick={reset}>
          <Plus className="size-4" />
          新对话
        </Button>
      </div>

      <div className="flex-1 overflow-hidden rounded-lg border border-border bg-card/35">
        <div className="flex h-full min-h-[560px] flex-col">
          <div className="flex-1 space-y-5 overflow-y-auto px-4 py-6 sm:px-6">
            {messages.length === 0 ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
                <h2 className="text-xl font-semibold">向你的知识库提问</h2>
                <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
                  支持当前会话上下文。回答会基于公开 Knowledge 检索，并在每条回复下方展示引用来源。
                </p>
              </div>
            ) : (
              messages.map((message) => <MessageBubble key={message.id} message={message} loading={loading} />)
            )}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>

          <div className="border-t border-border bg-background/85 p-3 backdrop-blur">
            <div className="grid gap-3 rounded-lg border border-border bg-background p-3">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    submit();
                  }
                }}
                placeholder="输入问题，Enter 发送，Shift + Enter 换行..."
                className="min-h-20 resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">仅使用公开知识库内容作为 RAG 来源。</p>
                <Button onClick={submit} disabled={loading || !input.trim()}>
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <SendHorizontal className="size-4" />}
                  {loading ? "生成中" : "发送"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message, loading }: { message: ChatMessage; loading: boolean }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[86%] rounded-lg px-4 py-3", isUser ? "bg-accent text-accent-foreground" : "bg-background")}>
        {message.content ? (
          isUser ? (
            <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
          ) : (
            <div className="garden-prose text-sm">
              <MarkdownView content={message.content} />
            </div>
          )
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            正在检索并生成回答...
          </div>
        )}

        {!isUser && message.sources && message.sources.length > 0 ? (
          <div className="mt-4 border-t border-border pt-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">引用来源</p>
            <div className="mt-2 grid gap-2">
              {message.sources.map((source, index) => (
                <Link
                  key={`${source.path}-${index}`}
                  href={source.url}
                  className="rounded-md border border-border bg-muted/25 p-2 text-xs leading-5 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <span className="font-medium text-foreground">{index + 1}. {source.title}</span>
                  <span className="mt-1 block break-all">{source.path}</span>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        {!isUser && loading && message.content ? (
          <div className="mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            继续生成中...
          </div>
        ) : null}
      </div>
    </div>
  );
}
