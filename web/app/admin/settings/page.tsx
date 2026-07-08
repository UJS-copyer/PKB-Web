import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { UploadField } from "@/components/admin/upload-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getRepositoryConfig } from "@/lib/admin/state-store";
import { getSiteSettings } from "@/lib/site-settings";

export const metadata: Metadata = {
  title: "站点设置"
};

export default async function AdminSettingsPage() {
  const [repository, settings] = await Promise.all([getRepositoryConfig(), getSiteSettings()]);
  const webhookUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000"}/api/webhooks/gitee`;

  return (
    <main>
      <AdminPageHeader
        eyebrow="Admin / Settings"
        title="站点设置"
        description="站点基础信息与 Obsidian 私有仓库配置。后台只配置和同步，不编辑正文。"
      />
      <section className="mx-auto grid max-w-[1400px] gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>站点资料</CardTitle>
          </CardHeader>
          <CardContent>
            <form action="/api/admin/site-settings" method="post" className="grid gap-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm">
                  <span className="text-muted-foreground">作者名称</span>
                  <Input name="name" defaultValue={settings.name} required />
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="text-muted-foreground">网站标题</span>
                  <Input name="title" defaultValue={settings.title} required />
                </label>
              </div>

                <label className="grid gap-2 text-sm">
                  <span className="text-muted-foreground">站点标语</span>
                  <Textarea name="slogan" defaultValue={settings.slogan} className="min-h-20" required />
                </label>

              <label className="grid gap-2 text-sm">
                <span className="text-muted-foreground">首页简介</span>
                <Textarea name="description" defaultValue={settings.description} required />
              </label>

              <label className="grid gap-2 text-sm">
                <span className="text-muted-foreground">个人简介</span>
                <Textarea name="bio" defaultValue={settings.bio} className="min-h-32" required />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm">
                  <span className="text-muted-foreground">教育经历</span>
                  <span className="text-xs text-muted-foreground/80">支持一行一段，首页会按多段展示。</span>
                  <Textarea name="education" defaultValue={settings.education} />
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="text-muted-foreground">研究方向</span>
                  <Textarea name="research" defaultValue={settings.research} />
                </label>
              </div>

              <label className="grid gap-2 text-sm">
                <span className="text-muted-foreground">技能栈（每行或逗号分隔）</span>
                <Textarea name="skills" defaultValue={settings.skills.join("\n")} className="min-h-28 font-mono" />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <UploadField
                  name="avatar"
                  label="头像 URL / 路径"
                  purpose="avatar"
                  accept="image/png,image/jpeg,image/webp"
                  defaultValue={settings.avatar}
                />
                <UploadField
                  name="resumeUrl"
                  label="简历链接"
                  purpose="resume"
                  accept="application/pdf"
                  defaultValue={settings.resumeUrl ?? ""}
                />
                <label className="grid gap-2 text-sm">
                  <span className="text-muted-foreground">GitHub</span>
                  <Input name="github" defaultValue={settings.github ?? ""} />
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="text-muted-foreground">邮箱</span>
                  <Input name="email" defaultValue={settings.email ?? ""} />
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="text-muted-foreground">主题色</span>
                  <Input name="themeColor" defaultValue={settings.themeColor} />
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="text-muted-foreground">默认暗色模式</span>
                  <select
                    name="darkMode"
                    defaultValue={settings.darkMode ? "true" : "false"}
                    className="h-10 rounded-md border border-input bg-background/60 px-3 text-sm"
                  >
                    <option value="true">开启</option>
                    <option value="false">关闭</option>
                  </select>
                </label>
              </div>

              <input name="logo" type="hidden" defaultValue={settings.logo ?? ""} />
              <div className="flex justify-end">
                <Button type="submit">保存站点资料</Button>
              </div>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Obsidian 仓库</CardTitle>
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
                <span className="text-muted-foreground">Gitee 访问令牌</span>
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
                  WebHook 地址
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
