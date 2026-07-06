import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Link2 } from "lucide-react";
import { MarkdownView } from "@/components/markdown/markdown-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { prepareMarkdown } from "@/lib/content/markdown";
import { getAllNotes, getMarkdownContext, getNoteBySlug, getRelatedNotes, resolveWikiLinkFromNotes } from "@/lib/content/source";

type NotePageProps = {
  params: Promise<{ slug: string[] }>;
};

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  if (process.env.NODE_ENV === "production" || process.env.CONTENT_SOURCE === "database") {
    return [];
  }
  return (await getAllNotes()).map((note) => ({ slug: note.slugSegments }));
}

export async function generateMetadata({ params }: NotePageProps): Promise<Metadata> {
  const { slug } = await params;
  const note = await getNoteBySlug(slug);
  return {
    title: note?.title ?? "Note",
    description: note?.excerpt
  };
}

export default async function KnowledgeNotePage({ params }: NotePageProps) {
  const { slug } = await params;
  const note = await getNoteBySlug(slug);
  if (!note) notFound();

  const allNotes = await getAllNotes();
  const related = await getRelatedNotes(note);
  const content = prepareMarkdown(note.content, note.relativePath, await getMarkdownContext(allNotes));

  return (
    <main className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:px-8">
      <article className="min-w-0">
        <Button asChild variant="ghost" size="sm" className="mb-6">
          <Link href="/knowledge">
            <ArrowLeft className="size-4" />
            Knowledge
          </Link>
        </Button>

        <header className="mb-8 border-b border-border pb-8">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {note.relativePath}
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            {note.title}
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-6 text-muted-foreground">{note.excerpt}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {note.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="rounded-full">
                {tag}
              </Badge>
            ))}
          </div>
        </header>

        <div className="garden-prose">
          <MarkdownView content={content} />
        </div>
      </article>

      <aside className="hidden lg:block">
        <div className="sticky top-24 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">目录</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-72">
                <div className="space-y-2">
                  {note.headings.length > 0 ? (
                    note.headings.map((heading) => (
                      <Link
                        key={`${heading.id}-${heading.text}`}
                        href={`#${heading.id}`}
                        className="block text-sm text-muted-foreground transition-colors hover:text-foreground"
                        style={{ paddingLeft: `${Math.max(0, heading.depth - 1) * 12}px` }}
                      >
                        {heading.text}
                      </Link>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No headings.</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Backlinks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {note.backlinks.slice(0, 8).map((slug) => {
                const backlink = allNotes.find((candidate) => candidate.slug === slug);
                if (!backlink) return null;
                return (
                  <Link
                    key={slug}
                    href={backlink.href}
                    prefetch={true}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Link2 className="size-3 text-accent" />
                    {backlink.title}
                  </Link>
                );
              })}
              {note.backlinks.length === 0 ? <p className="text-sm text-muted-foreground">No backlinks yet.</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">相关文章</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {related.map((item) => (
                <Link
                  key={item.slug}
                  href={item.href}
                  prefetch={true}
                  className="block rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {item.title}
                </Link>
              ))}
              {note.links.slice(0, 5).map((target) => {
                const link = resolveWikiLinkFromNotes(target, allNotes);
                if (!link || related.some((item) => item.slug === link.slug)) return null;
                return (
                  <Link
                    key={target}
                    href={link.href}
                    prefetch={true}
                    className="block rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {link.title}
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </aside>
    </main>
  );
}
