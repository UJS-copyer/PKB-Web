import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getRecentNotes } from "@/lib/content/source";

export const metadata: Metadata = {
  title: "Blog Publish"
};

export default async function AdminPublishPage() {
  const notes = await getRecentNotes(12);

  return (
    <main>
      <AdminPageHeader
        eyebrow="Admin / Publish"
        title="Blog Publish"
        description="发布状态最终写回 Markdown Frontmatter，保持 Obsidian 为唯一内容来源。"
      />
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>发布队列</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-5">
              <Input placeholder="Filter notes..." />
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
                      {note.published ? <Badge variant="accent">Published</Badge> : <Badge variant="outline">Draft</Badge>}
                    </div>
                    <p className="mt-1 break-all text-xs text-muted-foreground">{note.relativePath}</p>
                    <input type="hidden" name="sourcePath" value={note.relativePath} />
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <label className="grid gap-1 text-xs text-muted-foreground">
                        Slug
                        <Input name="slug" defaultValue={note.slug} className="h-8" />
                      </label>
                      <label className="grid gap-1 text-xs text-muted-foreground">
                        Category
                        <Input name="category" defaultValue={note.category ?? ""} className="h-8" />
                      </label>
                      <label className="grid gap-1 text-xs text-muted-foreground sm:col-span-2">
                        Cover
                        <Input name="cover" defaultValue={note.cover ?? ""} className="h-8" />
                      </label>
                    </div>
                  </div>
                  <div className="grid gap-3 rounded-md border border-border p-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="published" defaultChecked={note.published} />
                      设为公开
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="featured" defaultChecked={note.featured} />
                      设为推荐
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
