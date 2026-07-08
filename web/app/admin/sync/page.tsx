import type { Metadata } from "next";
import { Clock, GitBranch, RefreshCw } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSyncDashboard } from "@/lib/admin/state-store";
import { getLocalVaultSnapshot } from "@/lib/sync/runner";

export const metadata: Metadata = {
  title: "知识同步"
};

export default async function AdminSyncPage() {
  const dashboard = await getSyncDashboard();
  const local = getLocalVaultSnapshot();
  const repository = dashboard.repository;

  return (
    <main>
      <AdminPageHeader
        eyebrow="后台 / 同步"
        title="知识同步"
        description="扫描 Vault、同步新增/修改/删除、重建全文索引和 Embedding。"
      />
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>同步操作</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <form action="/api/admin/sync" method="post">
                <input type="hidden" name="action" value="sync" />
                <Button type="submit" variant="outline" className="w-full justify-start">
                  <RefreshCw className="size-4" />
                  一键同步 Gitee
                </Button>
              </form>
              <form action="/api/admin/sync" method="post">
                <input type="hidden" name="action" value="local-scan" />
                <Button type="submit" variant="outline" className="w-full justify-start">
                  <RefreshCw className="size-4" />
                  扫描本地 Vault
                </Button>
              </form>
              {["重新构建索引", "重新 Embedding"].map((action) => (
                <Button key={action} variant="outline" className="justify-start">
                  <RefreshCw className="size-4" />
                  {action}
                </Button>
              ))}
            </div>
            <div className="rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={repository.syncMode === "auto" ? "accent" : "outline"}>
                  {repository.syncMode === "auto" ? "自动同步" : "手动同步"}
                </Badge>
                <span className="font-mono text-xs text-muted-foreground">{repository.provider}</span>
              </div>
              <p className="mt-3 break-all text-sm">{repository.repoUrl}</p>
              <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                <span className="inline-flex items-center gap-2">
                  <GitBranch className="size-3" />
                  {repository.branch}
                </span>
                <span className="inline-flex items-center gap-2">
                  <Clock className="size-3" />
                  {repository.lastSyncedAt ?? "尚未同步"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>当前状态</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>本地笔记：{local.notes}</p>
            <p>本地资源：{local.assets}</p>
            <p>等待任务：{dashboard.pendingJobs}</p>
            <p>失败任务：{dashboard.failedJobs}</p>
            <p className="break-all">本地路径：{local.path}</p>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>同步任务</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard.jobs.length > 0 ? (
              dashboard.jobs.slice(0, 8).map((job) => (
                <div key={job.id} className="rounded-md border border-border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={job.status === "success" ? "accent" : job.status === "failed" ? "outline" : "secondary"}>
                        {job.status}
                      </Badge>
                      <span className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        {job.source}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">{job.createdAt}</span>
                  </div>
                  {job.error ? <p className="mt-2 text-sm text-destructive">{job.error}</p> : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">暂时还没有同步任务。</p>
            )}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>同步日志</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {dashboard.logs.length > 0 ? (
              dashboard.logs.slice(0, 12).map((log) => (
                <div key={log.id} className="grid gap-2 rounded-md border border-border p-3 text-sm md:grid-cols-[120px_1fr_180px]">
                  <span className="font-mono text-xs uppercase text-muted-foreground">{log.step}</span>
                  <span>{log.message}</span>
                  <span className="text-xs text-muted-foreground md:text-right">{log.createdAt}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">暂时还没有同步日志。</p>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
