"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SyncJob } from "@/lib/admin/types";

type RebuildResponse = {
  ok: boolean;
  queued?: boolean;
  created?: boolean;
  jobId?: string;
  status?: SyncJob["status"];
  error?: string;
};

function summarizeJob(job: SyncJob | null) {
  if (!job) return null;

  if (job.status === "running") {
    return {
      tone: "info" as const,
      text: "后台正在重建 Embedding。你可以离开当前页面，任务会继续执行。"
    };
  }

  if (job.status === "pending") {
    return {
      tone: "info" as const,
      text: "Embedding 重建任务已排队，稍后会自动开始。"
    };
  }

  if (job.status === "success") {
    const notes = typeof job.summary?.notes === "number" ? job.summary.notes : null;
    const chunks = typeof job.summary?.chunks === "number" ? job.summary.chunks : null;
    return {
      tone: "success" as const,
      text:
        notes !== null && chunks !== null
          ? `最近一次重建成功：${notes} 篇笔记，${chunks} 个分片。`
          : "最近一次 Embedding 重建成功。"
    };
  }

  if (job.status === "failed") {
    return {
      tone: "error" as const,
      text: job.error || "最近一次 Embedding 重建失败。"
    };
  }

  return null;
}

export function AdminAiConfigActions({ latestJob }: { latestJob: SyncJob | null }) {
  const router = useRouter();
  const [rebuilding, setRebuilding] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeJob = latestJob && (latestJob.status === "pending" || latestJob.status === "running") ? latestJob : null;
  const latestSummary = summarizeJob(latestJob);

  useEffect(() => {
    if (!activeJob) return;
    const timer = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(timer);
  }, [activeJob, router]);

  async function rebuildEmbeddings() {
    setRebuilding(true);
    setMessage("Embedding 重建任务已提交，后台会继续处理。");
    setError(null);

    try {
      const response = await fetch("/api/admin/ai-config/rebuild?format=json", {
        method: "POST",
        headers: {
          Accept: "application/json"
        }
      });

      const data = (await response.json().catch(() => null)) as RebuildResponse | null;
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "Embedding 重建失败。");
      }

      setMessage(data.created ? "Embedding 重建任务已加入后台队列。" : "已有 Embedding 重建任务正在执行，已复用现有任务。");
      router.refresh();
    } catch (caughtError) {
      const nextError = caughtError instanceof Error ? caughtError.message : "Embedding 重建失败。";
      setError(nextError);
      setMessage(null);
    } finally {
      setRebuilding(false);
    }
  }

  return (
    <div className="md:col-span-2 space-y-3">
      {(rebuilding || message || error || latestSummary) && (
        <div
          className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
            error || latestSummary?.tone === "error"
              ? "border-destructive/40 bg-destructive/5 text-destructive"
              : "border-accent/30 bg-accent/5 text-muted-foreground"
          }`}
          aria-live="polite"
        >
          {error || latestSummary?.tone === "error" ? (
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
          ) : (
            <Loader2
              className={`mt-0.5 size-4 shrink-0 text-accent ${
                rebuilding || activeJob ? "animate-spin" : ""
              }`}
            />
          )}
          <span>{error ?? message ?? latestSummary?.text}</span>
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-3">
        <Button type="button" onClick={rebuildEmbeddings} disabled={rebuilding || Boolean(activeJob)} variant="outline">
          {rebuilding || activeJob ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {rebuilding ? "提交中..." : activeJob ? "后台重建中..." : "重新 Embedding"}
        </Button>
        <Button type="submit" disabled={rebuilding || Boolean(activeJob)}>
          保存配置
        </Button>
      </div>
    </div>
  );
}
