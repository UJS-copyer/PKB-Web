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
  visibility: true,
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

function noteCacheTag(slug: string) {
  return `note:${Buffer.from(slug, "utf8").toString("base64url")}`;
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
  visibility: "public" | "private" | "unlisted";
  featured: boolean;
  readingMinutes: number;
  createdAt: Date;
  updatedAt: Date;
  sourceUpdatedAt: Date | null;
}): Note {
  const updatedAt = row.sourceUpdatedAt ?? row.updatedAt;
  const updatedAtIso = updatedAt.toISOString();
  const headings = (row.headings as Note["headings"] | null) ?? [];
  const fileTitle = path.posix.basename(row.sourcePath, ".md");
  const headingTitle = headings[0]?.text?.trim();
  const displayTitle = headingTitle && row.title.trim() === headingTitle && fileTitle !== row.title ? fileTitle : row.title;
  const aliases = Array.from(
    new Set([fileTitle, row.title, headingTitle].map((value) => value?.trim()).filter((value): value is string => Boolean(value)))
  ).filter((alias) => alias !== displayTitle);

  return {
    title: displayTitle,
    aliases,
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
    visibility: row.visibility,
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
    headings
  };
}

function noteOrderBy() {
  return [{ sourceUpdatedAt: "desc" as const }, { updatedAt: "desc" as const }];
}

async function queryDatabaseNoteMetas() {
  const rows = await prisma.note.findMany({
    where: { status: "active", visibility: "public" },
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
    where: { status: "active", visibility: "public" },
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
    where: { status: "active", visibility: "public", slug },
    select: noteDetailSelect
  });
  return row ? toNote(row) : null;
}

export async function getDatabaseNoteBySlug(slug: string) {
  return getRuntimeCached(`content:note:${slug}`, contentRuntimeTtlMs, () =>
    unstable_cache(() => queryDatabaseNoteBySlug(slug), ["database-note", slug], {
      revalidate: contentRevalidateSeconds,
      tags: ["content", noteCacheTag(slug)]
    })()
  );
}

async function queryDatabaseAdminNoteMetas(limit = 50) {
  const rows = await prisma.note.findMany({
    where: { status: "active" },
    select: noteMetaSelect,
    orderBy: noteOrderBy(),
    take: limit
  });
  return rows.map(toNote);
}

export async function getDatabaseAdminNoteMetas(limit = 50) {
  return getRuntimeCached(`admin:note-metas:${limit}`, 60 * 1000, () => queryDatabaseAdminNoteMetas(limit));
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
    for (const alias of note.aliases) {
      titleToNote.set(alias, note);
    }
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
