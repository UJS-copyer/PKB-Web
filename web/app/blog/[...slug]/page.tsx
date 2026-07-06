import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { MarkdownView } from "@/components/markdown/markdown-view";
import { Button } from "@/components/ui/button";
import { prepareMarkdown } from "@/lib/content/markdown";
import { getAllNotes, getMarkdownContext, getNoteBySlug, getPublishedNotes } from "@/lib/content/source";

type BlogPostProps = {
  params: Promise<{ slug: string[] }>;
};

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  if (process.env.NODE_ENV === "production" || process.env.CONTENT_SOURCE === "database") {
    return [];
  }
  return (await getPublishedNotes()).map((post) => ({ slug: post.slugSegments }));
}

export async function generateMetadata({ params }: BlogPostProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getNoteBySlug(slug);
  return {
    title: post?.published || post?.type === "blog" ? post.title : "Blog",
    description: post?.excerpt
  };
}

export default async function BlogPostPage({ params }: BlogPostProps) {
  const { slug } = await params;
  const post = await getNoteBySlug(slug);
  if (!post || (!post.published && post.type !== "blog")) notFound();
  const allNotes = await getAllNotes();
  const markdownContext = await getMarkdownContext(allNotes);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Button asChild variant="ghost" size="sm" className="mb-6">
        <Link href="/blog">
          <ArrowLeft className="size-4" />
          Blog
        </Link>
      </Button>
      <article>
        <header className="mb-8 border-b border-border pb-8">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {new Date(post.updatedAt).toLocaleDateString("zh-CN")} / {post.readingMinutes} min read
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            {post.title}
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">{post.excerpt}</p>
        </header>
        <div className="garden-prose">
          <MarkdownView content={prepareMarkdown(post.content, post.relativePath, markdownContext)} />
        </div>
      </article>
    </main>
  );
}
