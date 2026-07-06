import "server-only";

import path from "node:path";
import { unstable_cache } from "next/cache";
import { getRuntimeCached } from "@/lib/cache/runtime-cache";
import { prisma } from "@/lib/db/prisma";
import type { AssetRecord, Note } from "./vault";

const contentRevalidateSeconds = 600;
const contentRuntimeTtlMs = 10 * 60 * 1000;

const noteMetaSelect = {
  sourcePath: true,
  title: true,
  slug: true,
  description: true,
  category: true,
  cover: true,
  directory: true,
  excerpt: true,
  tags: true,
  links: true,
  backlinks: true,
  headings: true,
  type: true,
  published: true,
  featured: true,
  readingMinutes: true,
  createdAt: true,
  updatedAt: true,
  sourceUpdatedAt: true
} as const;

const noteDetailSelect = {
  ...noteMetaSelect,
  content: true,
  raw: true
} as const;

function hrefFromSlug(slug: string) {
  return `/knowledge/${slug.split("/").map(encodeURIComponent).join("/")}`;
}

function toNote(row: {
  sourcePath: string;
  title: string;
  slug: string;
  description: string | null;
  category: string | null;
  cover: string | null;
  directory: string;
  content?: string;
  raw?: string | null;
  excerpt: string | null;
  tags: string[];
  links: string[];
  backlinks: string[];
  headings: unknown;
  type: string;
  published: boolean;
  featured: boolean;
  readingMinutes: number;
  createdAt: Date;
  updatedAt: Date;
  sourceUpdatedAt: Date | null;
}): Note {
  const updatedAt = row.sourceUpdatedAt ?? row.updatedAt;
  const updatedAtIso = updatedAt.toISOString();
  return {
    title: row.title,
    slug: row.slug,
    slugSegments: row.slug.split("/"),
    href: hrefFromSlug(row.slug),
    relativePath: row.sourcePath,
    directory: row.directory,
    tags: row.tags,
    category: row.category ?? undefined,
    description: row.description ?? undefined,
    cover: row.cover ?? undefined,
    published: row.published,
    featured: row.featured,
    type: row.type as Note["type"],
    createdAt: row.createdAt.toISOString(),
    updatedAt: updatedAtIso,
    displayDate: updatedAtIso,
    displayDateLabel: "同步",
    sortDate: updatedAtIso,
    hasExplicitDate: false,
    excerpt: row.excerpt ?? "",
    links: row.links,
    backlinks: row.backlinks,
    readingMinutes: row.readingMinutes,
    content: row.content ?? "",
    raw: row.raw ?? row.content ?? "",
    headings: (row.headings as Note["headings"] | null) ?? []
  };
}

function noteOrderBy() {
  return [{ sourceUpdatedAt: "desc" as const }, { updatedAt: "desc" as const }];
}

async function queryDatabaseNoteMetas() {
  const rows = await prisma.note.findMany({
    where: { status: "active" },
    select: noteMetaSelect,
    orderBy: noteOrderBy()
  });
  return rows.map(toNote);
}

const cachedDatabaseNoteMetas = unstable_cache(queryDatabaseNoteMetas, ["database-note-metas"], {
  revalidate: contentRevalidateSeconds,
  tags: ["content"]
});

export async function getDatabaseNoteMetas() {
  return getRuntimeCached("content:note-metas", contentRuntimeTtlMs, cachedDatabaseNoteMetas);
}

async function queryDatabaseNotes() {
  const rows = await prisma.note.findMany({
    where: { status: "active" },
    select: noteDetailSelect,
    orderBy: noteOrderBy()
  });
  return rows.map(toNote);
}

const cachedDatabaseNotes = unstable_cache(queryDatabaseNotes, ["database-notes"], {
  revalidate: contentRevalidateSeconds,
  tags: ["content"]
});

export async function getDatabaseNotes() {
  return getRuntimeCached("content:notes", contentRuntimeTtlMs, cachedDatabaseNotes);
}

async function queryDatabaseNoteBySlug(slug: string) {
  const row = await prisma.note.findFirst({
    where: { status: "active", slug },
    select: noteDetailSelect
  });
  return row ? toNote(row) : null;
}

export async function getDatabaseNoteBySlug(slug: string) {
  return getRuntimeCached(`content:note:${slug}`, contentRuntimeTtlMs, () =>
    unstable_cache(() => queryDatabaseNoteBySlug(slug), ["database-note", slug], {
      revalidate: contentRevalidateSeconds,
      tags: ["content", `note:${slug}`]
    })()
  );
}

async function queryDatabaseAssets(): Promise<AssetRecord[]> {
  const rows = await prisma.asset.findMany({
    where: { status: "active" },
    orderBy: { sourcePath: "asc" }
  });

  return rows.map((asset) => ({
    name: asset.fileName,
    relativePath: asset.sourcePath,
    absolutePath: asset.blobUrl ?? `/api/assets/${asset.sourcePath.split("/").map(encodeURIComponent).join("/")}`
  }));
}

const cachedDatabaseAssets = unstable_cache(queryDatabaseAssets, ["database-assets"], {
  revalidate: contentRevalidateSeconds,
  tags: ["content", "assets"]
});

export async function getDatabaseAssets() {
  return getRuntimeCached("content:assets", contentRuntimeTtlMs, cachedDatabaseAssets);
}

export function resolveNoteFromList(target: string, notes: Note[]) {
  const titleToNote = new Map<string, Note>();
  const pathToNote = new Map<string, Note>();

  for (const note of notes) {
    titleToNote.set(note.title, note);
    titleToNote.set(path.posix.basename(note.relativePath, ".md"), note);
    pathToNote.set(note.slug, note);
    pathToNote.set(note.relativePath, note);
  }

  const clean = target.replace(/\.md$/i, "").trim();
  return (
    titleToNote.get(clean) ??
    pathToNote.get(clean) ??
    pathToNote.get(`${clean}.md`) ??
    titleToNote.get(path.posix.basename(clean)) ??
    null
  );
}
