import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Clock3, FileText, Link2 } from "lucide-react";
import { MarkdownView } from "@/components/markdown/markdown-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getAllNotes, getNoteBySlug, getNotePageData } from "@/lib/content/source";

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
  const data = await getNotePageData(slug);
  if (!data) notFound();

  const { note, content, backlinks, related, linkedNotes, date } = data;

  return (
    <main className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:px-8">
      <article className="min-w-0">
        <Button asChild variant="ghost" size="sm" className="mb-6">
          <Link href="/knowledge">
            <ArrowLeft className="size-4" />
            Knowledge
          </Link>
        </Button>

        <header className="mb-8 border-b border-border/80 pb-8">
          <p className="break-all font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
            {note.relativePath}
          </p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-balance sm:text-5xl">
            {note.title}
          </h1>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="size-4" />
              {note.readingMinutes} min read
            </span>
            <span>
              {date.displayDateLabel} {date.displayDate}
            </span>
            <span>{backlinks.length} backlinks</span>
          </div>
          {note.excerpt ? <p className="mt-5 max-w-3xl text-base leading-7 text-muted-foreground">{note.excerpt}</p> : null}
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
          <Card className="bg-card/45">
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
                        className="block rounded-md py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
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

          <Card className="bg-card/45">
            <CardHeader>
              <CardTitle className="text-base">Backlinks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {backlinks.map((backlink) => (
                <Link
                  key={backlink.slug}
                  href={backlink.href}
                  prefetch={false}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Link2 className="size-3 text-accent" />
                  {backlink.title}
                </Link>
              ))}
              {backlinks.length === 0 ? <p className="text-sm text-muted-foreground">No backlinks yet.</p> : null}
            </CardContent>
          </Card>

          <Card className="bg-card/45">
            <CardHeader>
              <CardTitle className="text-base">相关文章</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {related.map((item) => (
                <Link
                  key={item.slug}
                  href={item.href}
                  prefetch={false}
                  className="block rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {item.title}
                </Link>
              ))}
              {linkedNotes.map((link) => (
                <Link
                  key={link.slug}
                  href={link.href}
                  prefetch={false}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <FileText className="size-3 text-accent" />
                  {link.title}
                </Link>
              ))}
              {related.length === 0 && linkedNotes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No related notes yet.</p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </aside>
    </main>
  );
}
