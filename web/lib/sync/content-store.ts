import "server-only";

import crypto from "node:crypto";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { assetExtensions, parseNoteFromRaw, populateBacklinks, type Note } from "@/lib/content/vault";
import { databaseConfigured, prisma } from "@/lib/db/prisma";
import type { GiteeTreeItem } from "@/lib/gitee/client";
import type { EmbeddingNoteChange } from "@/lib/rag/embeddings";

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
  embeddingNotes: EmbeddingNoteChange[];
  embeddingDeletedPaths: string[];
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

type ExistingNoteSnapshot = {
  sourcePath: string;
  sha: string | null;
  createdAt: Date;
  sourceUpdatedAt: Date | null;
};

type ParsedRemoteNote = {
  note: Note;
  changed: boolean;
};

function parseRemoteNotes(markdownFiles: RemoteMarkdownFile[], existingByPath: Map<string, ExistingNoteSnapshot>) {
  const syncedAt = new Date().toISOString();
  const notes: ParsedRemoteNote[] = markdownFiles.map((file) => {
    const existing = existingByPath.get(file.path);
    const unchanged = Boolean(existing?.sha && file.sha && existing.sha === file.sha);
    const previousUpdatedAt = existing?.sourceUpdatedAt?.toISOString() ?? existing?.createdAt.toISOString();
    const updatedAt = unchanged && previousUpdatedAt ? previousUpdatedAt : syncedAt;

    return {
      changed: !unchanged,
      note: parseNoteFromRaw({
      relativePath: file.path,
      raw: file.content,
      createdAt: existing?.createdAt.toISOString(),
      updatedAt
      })
    };
  });
  populateBacklinks(notes.map((item) => item.note));
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
    visibility: note.visibility,
    type: note.type,
    published: note.published,
    featured: note.featured,
    readingMinutes: note.readingMinutes,
    sourceUpdatedAt: asDate(note.updatedAt)
  };

  return prisma.note.upsert({
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
      linksUpserted: 0,
      embeddingNotes: [],
      embeddingDeletedPaths: []
    };
  }

  const existingRows =
    input.markdownFiles.length > 0
      ? await prisma.note.findMany({
          where: { sourcePath: { in: input.markdownFiles.map((file) => file.path) } },
          select: {
            sourcePath: true,
            sha: true,
            createdAt: true,
            sourceUpdatedAt: true
          }
        })
      : [];
  const existingByPath = new Map(existingRows.map((note) => [note.sourcePath, note]));
  const parsedNotes = parseRemoteNotes(input.markdownFiles, existingByPath);
  const notes = parsedNotes.map((item) => item.note);
  const noteByPath = new Map(input.markdownFiles.map((file) => [file.path, file]));
  const syncResults = await mapWithConcurrency(parsedNotes, 4, async ({ note, changed }) => {
    const file = noteByPath.get(note.relativePath);
    if (!file) {
      return { links: 0, embeddingNote: undefined };
    }

    const upserted = await upsertNote(note, file);
    return {
      links: await refreshLinks(note),
      embeddingNote: changed
        ? ({
            id: upserted.id,
            sourcePath: upserted.sourcePath,
            slug: upserted.slug,
            title: upserted.title,
            content: upserted.content,
            excerpt: upserted.excerpt,
            visibility: upserted.visibility
          } satisfies EmbeddingNoteChange)
        : undefined
    };
  });
  const linksUpserted = syncResults.reduce((sum, result) => sum + result.links, 0);
  const embeddingNotes = syncResults.flatMap((result) => (result.embeddingNote ? [result.embeddingNote] : []));

  const tagsUpserted = await upsertTags(notes);

  await mapWithConcurrency(input.assetFiles, 8, upsertAsset);

  const notePaths = notes.map((note) => note.relativePath);
  const assetPaths = input.assetFiles.map((file) => file.path);
  const deletedNotes =
    input.fullSync
      ? await prisma.note.findMany({
          where: {
            sourcePath: { notIn: notePaths },
            status: "active"
          },
          select: { sourcePath: true }
        })
      : [];
  const notesDeleted = deletedNotes.length
    ? (
        await prisma.note.updateMany({
          where: {
            sourcePath: { in: deletedNotes.map((note) => note.sourcePath) },
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
    linksUpserted,
    embeddingNotes,
    embeddingDeletedPaths: deletedNotes.map((note) => note.sourcePath)
  };
}
