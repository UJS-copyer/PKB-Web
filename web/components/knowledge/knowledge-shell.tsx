import Link from "next/link";
import { Shuffle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getKnowledgeTree, getRecentNotes, type NoteMeta } from "@/lib/content/source";
import { GraphPreview } from "./graph-preview";

export async function KnowledgeShell() {
  const tree = await getKnowledgeTree();
  const recent = await getRecentNotes(8);
  const random = recent[Math.floor(Math.random() * Math.max(recent.length, 1))];

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[280px_1fr_340px] lg:px-8">
      <aside className="hidden lg:block">
        <div className="sticky top-24">
          <div className="mb-4">
            <Input placeholder="Filter directory..." />
          </div>
          <ScrollArea className="h-[calc(100vh-9rem)] rounded-lg border border-border bg-card/40 p-4">
            <div className="space-y-5">
              {tree.slice(0, 18).map((group) => (
                <div key={group.directory}>
                  <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    {group.directory}
                  </p>
                  <div className="space-y-1">
                    {group.notes.slice(0, 8).map((note) => (
                      <Link
                        key={note.slug}
                        href={note.href}
                        className="block truncate rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        {note.title}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </aside>

      <main className="min-w-0 space-y-6">
        <Card className="bg-card/50">
          <CardHeader>
            <CardTitle className="text-2xl">Knowledge Index</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted-foreground">
              这里直接读取 Obsidian Vault。目录、WikiLink、Backlink、搜索索引和 RAG 索引都应从同一份 Markdown 内容派生。
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <Stat label="Notes" value={String(tree.reduce((sum, group) => sum + group.notes.length, 0))} />
              <Stat label="Directories" value={String(tree.length)} />
              <Stat label="Recently Updated" value={recent[0]?.title ?? "None"} compact />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-3">
          {recent.map((note) => (
            <KnowledgeRow key={note.slug} note={note} />
          ))}
        </div>
      </main>

      <aside className="space-y-6">
        {random ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shuffle className="size-4 text-accent" />
                随机文章
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link href={random.href} prefetch={true} className="text-lg font-medium tracking-tight hover:text-accent">
                {random.title}
              </Link>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{random.excerpt}</p>
              <Button asChild variant="outline" size="sm" className="mt-5">
                <Link href={random.href} prefetch={true}>Read note</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}
        <GraphPreview />
      </aside>
    </div>
  );
}

function Stat({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-background/50 p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className={compact ? "mt-2 truncate text-sm font-medium" : "mt-2 text-2xl font-semibold"}>{value}</p>
    </div>
  );
}

function KnowledgeRow({ note }: { note: NoteMeta }) {
  return (
    <Link
      href={note.href}
      prefetch={true}
      className="group rounded-lg border border-border bg-card/40 p-5 transition-colors hover:bg-muted/40"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-semibold tracking-tight group-hover:text-accent">{note.title}</h2>
        {note.tags.slice(0, 4).map((tag) => (
          <Badge key={tag} variant="outline" className="rounded-full">
            {tag}
          </Badge>
        ))}
      </div>
      <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">{note.excerpt || note.relativePath}</p>
      <div className="mt-4 flex flex-wrap gap-4 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
        <span>{note.readingMinutes} min</span>
        <span>{note.backlinks.length} backlinks</span>
        <span>{new Date(note.updatedAt).toLocaleDateString("zh-CN")}</span>
      </div>
    </Link>
  );
}
