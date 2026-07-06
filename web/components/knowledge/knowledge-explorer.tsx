"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  BookOpen,
  ChevronRight,
  Clock3,
  FileText,
  Folder,
  GitBranch,
  PanelLeftOpen,
  Search,
  Shuffle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { GraphPreview } from "./graph-preview";

type NoteListItem = {
  title: string;
  slug: string;
  href: string;
  relativePath: string;
  directory: string;
  tags: string[];
  published: boolean;
  type: "note" | "blog" | "project";
  excerpt: string;
  backlinks: string[];
  readingMinutes: number;
  updatedAt: string;
  displayDate?: string;
  displayDateLabel: "更新" | "创建" | "同步" | "未设置日期";
};

type TreeNode = {
  type: "folder";
  name: string;
  path: string;
  children: TreeNode[];
  notes: NoteListItem[];
  count: number;
};

type ViewMode = "recent" | "public" | "all";

type KnowledgeExplorerProps = {
  tree: TreeNode[];
  notes: NoteListItem[];
  recent: NoteListItem[];
  random?: NoteListItem;
  initialQuery?: string;
  graph: {
    nodes: Array<{ id: string; title: string; group?: string }>;
    links: Array<{ source: string; target: string }>;
  };
};

const viewModes: Array<{ value: ViewMode; label: string }> = [
  { value: "recent", label: "最近更新" },
  { value: "public", label: "公开文章" },
  { value: "all", label: "全部笔记" }
];

export function KnowledgeExplorer({ tree, notes, recent, random, graph, initialQuery = "" }: KnowledgeExplorerProps) {
  const [query, setQuery] = useState(initialQuery);
  const [viewMode, setViewMode] = useState<ViewMode>("recent");
  const [openFolders, setOpenFolders] = useState<Set<string>>(() => new Set(tree.slice(0, 8).map((node) => node.path)));

  const normalizedQuery = query.trim().toLowerCase();
  const filteredNotes = useMemo(() => {
    const base =
      viewMode === "recent"
        ? recent
        : viewMode === "public"
          ? notes.filter((note) => note.published || note.type === "blog")
          : notes;

    if (!normalizedQuery) return base;
    return notes.filter((note) => {
      const haystack = [note.title, note.relativePath, note.directory, note.excerpt, ...note.tags].join(" ").toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [normalizedQuery, notes, recent, viewMode]);

  const visibleNotes = filteredNotes.slice(0, normalizedQuery ? 80 : 36);
  const folderCount = useMemo(() => countFolders(tree), [tree]);

  function toggleFolder(path: string) {
    setOpenFolders((current) => {
      const next = new Set(current);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }

  const directory = <DirectoryTree nodes={tree} openFolders={openFolders} onToggle={toggleFolder} />;

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[300px_minmax(0,1fr)_300px] lg:px-8">
      <aside className="hidden lg:block">
        <div className="sticky top-24">
          <PanelTitle icon={Folder} label="Vault" value={`${notes.length} notes`} />
          <ScrollArea className="mt-4 h-[calc(100vh-10rem)] rounded-lg border border-border/80 bg-card/45 p-3">
            {directory}
          </ScrollArea>
        </div>
      </aside>

      <main className="min-w-0 space-y-6">
        <section className="rounded-lg border border-border/80 bg-card/45 p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">Obsidian Knowledge Base</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Knowledge</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                这里展示从 Obsidian 同步来的笔记、公开文章、标签和反向链接。内容源保持唯一，网站只负责阅读、检索和发布。
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:min-w-[320px]">
              <Stat label="Notes" value={String(notes.length)} />
              <Stat label="Folders" value={String(folderCount)} />
              <Stat label="Public" value={String(notes.filter((note) => note.published || note.type === "blog").length)} />
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="justify-start lg:hidden">
                  <PanelLeftOpen className="size-4" />
                  目录
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[86vw] max-w-sm">
                <SheetHeader>
                  <SheetTitle>Vault 目录</SheetTitle>
                </SheetHeader>
                <ScrollArea className="mt-5 h-[calc(100vh-7rem)] pr-2">{directory}</ScrollArea>
              </SheetContent>
            </Sheet>

            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-10 pl-10"
                placeholder="搜索标题、路径、标签或正文摘要..."
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {viewModes.map((mode) => (
              <Button
                key={mode.value}
                type="button"
                variant={viewMode === mode.value ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode(mode.value)}
              >
                {mode.label}
              </Button>
            ))}
          </div>
        </section>

        <section className="grid gap-3">
          {visibleNotes.map((note) => (
            <KnowledgeRow key={note.slug} note={note} />
          ))}
          {visibleNotes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              没有找到匹配的笔记。
            </div>
          ) : null}
          {filteredNotes.length > visibleNotes.length ? (
            <p className="px-1 text-sm text-muted-foreground">已显示 {visibleNotes.length} 篇，继续输入关键词可缩小范围。</p>
          ) : null}
        </section>
      </main>

      <aside className="space-y-5">
        {random ? (
          <section className="rounded-lg border border-border/80 bg-card/45 p-5">
            <PanelTitle icon={Shuffle} label="随机文章" />
            <Link href={random.href} prefetch={false} className="mt-4 block text-lg font-medium tracking-tight hover:text-accent">
              {random.title}
            </Link>
            <p className="mt-3 line-clamp-4 text-sm leading-6 text-muted-foreground">{random.excerpt || random.relativePath}</p>
            <Button asChild variant="outline" size="sm" className="mt-5">
              <Link href={random.href} prefetch={false}>
                阅读
              </Link>
            </Button>
          </section>
        ) : null}

        <section className="rounded-lg border border-border/80 bg-card/45 p-5">
          <PanelTitle icon={GitBranch} label="Graph" />
          <div className="mt-4">
            <GraphPreview graph={graph} />
          </div>
        </section>
      </aside>
    </div>
  );
}

function DirectoryTree({
  nodes,
  openFolders,
  onToggle,
  depth = 0
}: {
  nodes: TreeNode[];
  openFolders: Set<string>;
  onToggle: (path: string) => void;
  depth?: number;
}) {
  return (
    <div className={cn("space-y-1", depth > 0 && "pl-3")}>
      {nodes.map((node) => {
        const open = openFolders.has(node.path);
        return (
          <div key={node.path || node.name}>
            <button
              type="button"
              onClick={() => onToggle(node.path)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ChevronRight className={cn("size-3.5 shrink-0 transition-transform", open && "rotate-90")} />
              <Folder className="size-3.5 shrink-0 text-accent" />
              <span className="min-w-0 flex-1 truncate">{node.name}</span>
              <span className="font-mono text-[10px] text-muted-foreground">{node.count}</span>
            </button>
            {open ? (
              <div className="mt-1 space-y-1 pl-5">
                {node.notes.map((note) => (
                  <Link
                    key={note.slug}
                    href={note.href}
                    prefetch={false}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    title={note.relativePath}
                  >
                    <FileText className="size-3.5 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{note.title}</span>
                  </Link>
                ))}
                {node.children.length > 0 ? (
                  <DirectoryTree nodes={node.children} openFolders={openFolders} onToggle={onToggle} depth={depth + 1} />
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function KnowledgeRow({ note }: { note: NoteListItem }) {
  const date = noteDate(note);

  return (
    <Link
      href={note.href}
      prefetch={false}
      className="group rounded-lg border border-border/80 bg-card/35 p-5 transition-colors hover:border-accent/40 hover:bg-muted/35"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="truncate font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{note.directory || "Root"}</p>
          <h2 className="mt-2 text-xl font-semibold leading-snug tracking-tight group-hover:text-accent sm:text-2xl">{note.title}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
          <Clock3 className="size-3.5" />
          {note.readingMinutes} min
        </div>
      </div>
      <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground sm:text-[15px]">{note.excerpt || note.relativePath}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {note.tags.slice(0, 4).map((tag) => (
          <Badge key={tag} variant="outline" className="rounded-full border-border/80 text-muted-foreground">
            {tag}
          </Badge>
        ))}
        <span className="ml-auto font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          {date.label} {date.value}
        </span>
      </div>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/80 bg-background/45 px-3 py-2">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function PanelTitle({ icon: Icon, label, value }: { icon: typeof BookOpen; label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Icon className="size-4 text-accent" />
        {label}
      </div>
      {value ? <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{value}</span> : null}
    </div>
  );
}

function noteDate(note: NoteListItem) {
  const source = note.displayDate ?? note.updatedAt;
  const date = new Date(source);
  if (Number.isNaN(date.getTime())) {
    return { label: "日期", value: "未设置" };
  }
  return {
    label: note.displayDateLabel,
    value: date.toISOString().slice(0, 10)
  };
}

function countFolders(nodes: TreeNode[]): number {
  return nodes.reduce((sum, node) => sum + 1 + countFolders(node.children), 0);
}
