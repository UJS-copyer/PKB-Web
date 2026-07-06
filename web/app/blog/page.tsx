import Link from "next/link";
import type { Metadata } from "next";
import { Rss } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPublishedNotes } from "@/lib/content/source";

export const metadata: Metadata = {
  title: "Blog"
};

export const revalidate = 60;

export default async function BlogPage() {
  const posts = await getPublishedNotes();

  return (
    <main>
      <PageHeader
        eyebrow="Blog"
        title="公开文章"
        description="Blog 是 Knowledge 中被 Frontmatter 标记为公开的文章视图。"
      />
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-end">
          <Button asChild variant="outline" size="sm">
            <Link href="/rss.xml">
              <Rss className="size-4" />
              RSS
            </Link>
          </Button>
        </div>
        <div className="grid gap-4">
          {posts.length > 0 ? (
            posts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slugSegments.map(encodeURIComponent).join("/")}`}
                prefetch={true}
                className="group rounded-lg border border-border bg-card/40 p-6 transition-colors hover:bg-muted/40"
              >
                <div className="flex flex-wrap gap-2">
                  {post.tags.slice(0, 4).map((tag) => (
                    <Badge key={tag} variant="outline" className="rounded-full">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight group-hover:text-accent">
                  {post.title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{post.excerpt}</p>
              </Link>
            ))
          ) : (
            <div className="rounded-lg border border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
              当前 Vault 中还没有 `published: true` 的文章。可在后台或 Obsidian Frontmatter 中设置公开状态。
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
