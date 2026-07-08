import Link from "next/link";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminStats } from "@/lib/sample-data";
import { getSyncDashboard } from "@/lib/admin/state-store";

export const metadata: Metadata = {
  title: "Admin"
};

const adminLinks = [
  { href: "/admin/sync", title: "知识同步", description: "扫描 Vault、增量同步、重建索引。" },
  { href: "/admin/publish", title: "博客发布", description: "公开、推荐、封面和 slug 配置。" },
  { href: "/admin/ai-config", title: "AI 配置", description: "Provider、模型、Chunk、TopK、Prompt。" },
  { href: "/admin/settings", title: "站点设置", description: "站点标题、头像、社交链接、主题色。" }
];

export default async function AdminPage() {
  const sync = await getSyncDashboard();
  const stats = [
    ...adminStats,
    { label: "同步模式", value: sync.repository.syncMode === "auto" ? "自动" : "手动", hint: sync.repository.repoUrl },
    { label: "任务队列", value: String(sync.pendingJobs), hint: `${sync.failedJobs} 个失败任务` }
  ];

  return (
    <main>
      <AdminPageHeader eyebrow="Admin" title="轻量后台" description="后台只负责同步、发布和配置，不提供富文本编辑器。" />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">{stat.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{stat.value}</p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{stat.hint}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-3">
              Repository
              <Badge variant={sync.repository.syncMode === "auto" ? "accent" : "outline"}>
                {sync.repository.syncMode}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p className="break-all">{sync.repository.repoUrl}</p>
            <p>分支：{sync.repository.branch}</p>
            <p>最近同步：{sync.repository.lastSyncedAt ?? "尚未同步"}</p>
          </CardContent>
        </Card>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {adminLinks.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-lg border border-border bg-card p-6 transition-colors hover:bg-muted/40">
              <h2 className="text-xl font-semibold">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
