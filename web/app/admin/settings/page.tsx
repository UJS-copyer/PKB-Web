import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { siteConfig } from "@/lib/site-config";
import { getRepositoryConfig } from "@/lib/admin/state-store";

export const metadata: Metadata = {
  title: "Settings"
};

export default async function AdminSettingsPage() {
  const repository = await getRepositoryConfig();
  const webhookUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000"}/api/webhooks/gitee`;

  return (
    <main>
      <AdminPageHeader
        eyebrow="Admin / Settings"
        title="Settings"
        description="站点基础信息与 Obsidian 私有仓库配置。后台只配置和同步，不编辑正文。"
      />
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_1fr] lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>站点设置</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            {[
              ["网站标题", siteConfig.title],
              ["Logo", siteConfig.name],
              ["头像", siteConfig.avatar],
              ["GitHub", siteConfig.github],
              ["邮箱", siteConfig.email],
              ["主题色", "#2563eb"]
            ].map(([label, value]) => (
              <label key={label} className="grid gap-2 text-sm">
                <span className="text-muted-foreground">{label}</span>
                <Input defaultValue={value} />
              </label>
            ))}
            <div className="md:col-span-2 flex justify-end">
              <Button>保存设置</Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Obsidian Repository</CardTitle>
          </CardHeader>
          <CardContent>
            <form action="/api/admin/settings" method="post" className="grid gap-5">
              <label className="grid gap-2 text-sm">
                <span className="text-muted-foreground">仓库地址</span>
                <Input name="repoUrl" defaultValue={repository.repoUrl} required />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm">
                  <span className="text-muted-foreground">分支</span>
                  <Input name="branch" defaultValue={repository.branch} required />
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="text-muted-foreground">同步模式</span>
                  <select
                    name="syncMode"
                    defaultValue={repository.syncMode}
                    className="h-10 rounded-md border border-input bg-background/60 px-3 text-sm"
                  >
                    <option value="manual">手动同步</option>
                    <option value="auto">自动同步</option>
                  </select>
                </label>
              </div>
              <label className="grid gap-2 text-sm">
                <span className="text-muted-foreground">Gitee Personal Access Token</span>
                <Input name="token" type="password" placeholder={repository.tokenMasked || "保存后仅显示掩码"} />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="text-muted-foreground">Webhook Secret</span>
                <Input
                  name="webhookSecret"
                  type="password"
                  placeholder={repository.webhookSecretMasked || "用于校验 Gitee WebHook"}
                />
              </label>
              <div className="rounded-md border border-border bg-muted/30 p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  WebHook URL
                </p>
                <p className="mt-2 break-all text-sm">{webhookUrl}</p>
              </div>
              <div className="flex justify-end">
                <Button type="submit">保存仓库配置</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
