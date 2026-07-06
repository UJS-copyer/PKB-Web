"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function KnowledgeNoteError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 text-center">
      <div className="rounded-full border border-border bg-card p-3">
        <AlertTriangle className="size-5 text-accent" />
      </div>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight">这篇笔记暂时无法加载</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        可能是 Markdown 内容、Frontmatter 或资源引用出现了异常。你可以重试，或回到知识库继续阅读其他笔记。
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button type="button" onClick={reset}>
          重试
        </Button>
        <Button asChild variant="outline">
          <Link href="/knowledge">返回 Knowledge</Link>
        </Button>
      </div>
    </main>
  );
}
