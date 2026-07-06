import "server-only";

import crypto from "node:crypto";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { assetExtensions, parseNoteFromRaw, populateBacklinks, type Note } from "@/lib/content/vault";
import { databaseConfigured, prisma } from "@/lib/db/prisma";
import type { GiteeTreeItem } from "@/lib/gitee/client";

const ignoredSegments = new Set([".git", ".obsidian", "node_modules"]);

export type RemoteMarkdownFile = GiteeTreeItem & {
  content: string;
};

export type ContentSyncResult = {
  mode: "database-upsert" | "database-skipped";
  notesUpserted: number;
  notesDeleted: number;
  assetsUpserted: number;
  assetsDeleted: number;
  tagsUpserted: number;
  linksUpserted: number;
};

export function isIgnoredSourcePath(sourcePath: string) {
  return sourcePath.split("/").some((segment) => ignoredSegments.has(segment));
}

export function isMarkdownPath(sourcePath: string) {
  return /\.md$/i.test(sourcePath) && !isIgnoredSourcePath(sourcePath);
}

export function isAssetPath(sourcePath: string) {
  return assetExtensions.has(path.posix.extname(sourcePath).toLowerCase()) && !isIgnoredSourcePath(sourcePath);
}

function hashContent(content: string) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function asDate(value: string) {
  return new Date(value);
}

function mimeTypeFor(sourcePath: string) {
  const ext = path.posix.extname(sourcePath).toLowerCase();
  const types: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".tif": "image/tiff",
    ".tiff": "image/tiff"
  };
  return types[ext] ?? "application/octet-stream";
}

function parseRemoteNotes(markdownFiles: RemoteMarkdownFile[]) {
  const notes = markdownFiles.map((file) =>
    parseNoteFromRaw({
      relativePath: file.path,
      raw: file.content,
      updatedAt: new Date().toISOString()
    })
  );
  populateBacklinks(notes);
  return notes;
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, mapper: (item: T) => Promise<R>) {
  const results: R[] = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function upsertNote(note: Note, file: RemoteMarkdownFile) {
  const baseData = {
    title: note.title,
    slug: note.slug,
    description: note.description,
    category: note.category,
    cover: note.cover,
    directory: note.directory,
    content: note.content,
    raw: note.raw,
    excerpt: note.excerpt,
    tags: note.tags,
    links: note.links,
    backlinks: note.backlinks,
    headings: note.headings as Prisma.InputJsonValue,
    sha: file.sha,
    hash: hashContent(file.content),
    status: "active" as const,
    type: note.type,
    published: note.published,
    featured: note.featured,
    readingMinutes: note.readingMinutes,
    sourceUpdatedAt: asDate(note.updatedAt)
  };

  await prisma.note.upsert({
    where: { sourcePath: note.relativePath },
    create: {
      sourcePath: note.relativePath,
      createdAt: asDate(note.createdAt),
      ...baseData
    },
    update: baseData
  });
}

async function refreshLinks(note: Note) {
  await prisma.link.deleteMany({ where: { sourcePath: note.relativePath } });
  if (note.links.length === 0) return 0;

  await prisma.link.createMany({
    data: note.links.map((target) => ({
      sourcePath: note.relativePath,
      target
    }))
  });
  return note.links.length;
}

async function upsertTags(notes: Note[]) {
  const tags = Array.from(new Set(notes.flatMap((note) => note.tags))).filter(Boolean);
  if (tags.length > 0) {
    await prisma.tag.createMany({
      data: tags.map((name) => ({ name })),
      skipDuplicates: true
    });
  }
  return tags.length;
}

async function upsertAsset(file: GiteeTreeItem) {
  await prisma.asset.upsert({
    where: { sourcePath: file.path },
    create: {
      sourcePath: file.path,
      fileName: path.posix.basename(file.path),
      mimeType: mimeTypeFor(file.path),
      size: file.size,
      sha: file.sha,
      hash: file.sha,
      status: "active"
    },
    update: {
      fileName: path.posix.basename(file.path),
      mimeType: mimeTypeFor(file.path),
      size: file.size,
      sha: file.sha,
      hash: file.sha,
      status: "active"
    }
  });
}

export async function syncContentToDatabase(input: {
  markdownFiles: RemoteMarkdownFile[];
  assetFiles: GiteeTreeItem[];
  fullSync: boolean;
}): Promise<ContentSyncResult> {
  if (!databaseConfigured()) {
    return {
      mode: "database-skipped",
      notesUpserted: 0,
      notesDeleted: 0,
      assetsUpserted: 0,
      assetsDeleted: 0,
      tagsUpserted: 0,
      linksUpserted: 0
    };
  }

  const notes = parseRemoteNotes(input.markdownFiles);
  const noteByPath = new Map(input.markdownFiles.map((file) => [file.path, file]));
  const linkCounts = await mapWithConcurrency(notes, 4, async (note) => {
    const file = noteByPath.get(note.relativePath);
    if (!file) return 0;
    await upsertNote(note, file);
    return refreshLinks(note);
  });
  const linksUpserted = linkCounts.reduce((sum, count) => sum + count, 0);

  const tagsUpserted = await upsertTags(notes);

  await mapWithConcurrency(input.assetFiles, 8, upsertAsset);

  const notePaths = notes.map((note) => note.relativePath);
  const assetPaths = input.assetFiles.map((file) => file.path);
  const notesDeleted =
    input.fullSync && notePaths.length > 0
      ? (
          await prisma.note.updateMany({
            where: {
              sourcePath: { notIn: notePaths },
              status: "active"
            },
            data: { status: "deleted" }
          })
        ).count
      : 0;
  const assetsDeleted =
    input.fullSync && assetPaths.length > 0
      ? (
          await prisma.asset.updateMany({
            where: {
              sourcePath: { notIn: assetPaths },
              status: "active"
            },
            data: { status: "deleted" }
          })
        ).count
      : 0;

  return {
    mode: "database-upsert",
    notesUpserted: notes.length,
    notesDeleted,
    assetsUpserted: input.assetFiles.length,
    assetsDeleted,
    tagsUpserted,
    linksUpserted
  };
}
