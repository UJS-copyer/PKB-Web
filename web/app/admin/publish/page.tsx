import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getAdminNotes } from "@/lib/content/source";

export const metadata: Metadata = {
  title: "博客发布"
};

export default async function AdminPublishPage() {
  const notes = await getAdminNotes(30);

  return (
    <main>
      <AdminPageHeader
        eyebrow="后台 / 发布"
        title="博客发布"
        description="可见性控制知识库与 AI 的前台可见范围，发布状态控制是否进入博客。修改会写回 Markdown Frontmatter。"
      />
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>发布队列</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-5">
              <Input placeholder="筛选笔记标题或路径..." />
            </div>
            <div className="divide-y divide-border rounded-lg border border-border">
              {notes.map((note) => (
                <form
                  key={note.slug}
                  action="/api/admin/publish"
                  method="post"
                  className="grid gap-4 p-4 md:grid-cols-[1fr_360px] md:items-start"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-medium">{note.title}</h2>
                      <Badge variant={note.visibility === "public" ? "accent" : "outline"}>{note.visibility}</Badge>
                      {note.published ? <Badge variant="accent">博客</Badge> : <Badge variant="outline">草稿</Badge>}
                    </div>
                    <p className="mt-1 break-all text-xs text-muted-foreground">{note.relativePath}</p>
                    <input type="hidden" name="sourcePath" value={note.relativePath} />
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <label className="grid gap-1 text-xs text-muted-foreground">
                        Slug
                        <Input name="slug" defaultValue={note.slug} className="h-8" />
                      </label>
                      <label className="grid gap-1 text-xs text-muted-foreground">
                        分类
                        <Input name="category" defaultValue={note.category ?? ""} className="h-8" />
                      </label>
                      <label className="grid gap-1 text-xs text-muted-foreground sm:col-span-2">
                        封面
                        <Input name="cover" defaultValue={note.cover ?? ""} className="h-8" />
                      </label>
                    </div>
                  </div>
                  <div className="grid gap-3 rounded-md border border-border p-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="published" defaultChecked={note.published} />
                      发布到 Blog
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="featured" defaultChecked={note.featured} />
                      设为推荐
                    </label>
                    <label className="grid gap-1 text-sm">
                      <span className="text-xs text-muted-foreground">Knowledge 可见性</span>
                      <select
                        name="visibility"
                        defaultValue={note.visibility}
                        className="h-9 rounded-md border border-input bg-background/60 px-2 text-sm"
                      >
                        <option value="public">公开</option>
                        <option value="private">私有</option>
                        <option value="unlisted">不公开链接</option>
                      </select>
                    </label>
                    <Button variant="outline" size="sm" type="submit">
                      写回 Gitee Frontmatter
                    </Button>
                  </div>
                </form>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
