import "server-only";

import path from "node:path";
import { cache } from "react";
import { databaseConfigured } from "@/lib/db/prisma";
import type { MarkdownContext } from "./markdown";
import {
  decodeRouteSegments,
  getAllNotes as getVaultNotes,
  getGraphData as getVaultGraphData,
  getKnowledgeTree as getVaultKnowledgeTree,
  getNoteBySlug as getVaultNoteBySlug,
  getPublishedNotes as getVaultPublishedNotes,
  getRecentNotes as getVaultRecentNotes,
  getRelatedNotes as getVaultRelatedNotes,
  resolveAsset as resolveVaultAsset,
  resolveWikiLink as resolveVaultWikiLink,
  type AssetRecord,
  type Note,
  type NoteMeta
} from "./vault";
import { getDatabaseAssets, getDatabaseNoteBySlug, getDatabaseNoteMetas, resolveNoteFromList } from "./database";

export { decodeRouteSegments };
export type { AssetRecord, Note, NoteMeta };

function prefersDatabase() {
  if (process.env.NEXT_PHASE === "phase-production-build" || process.env.npm_lifecycle_event === "build") {
    return false;
  }
  const source = process.env.CONTENT_SOURCE;
  if (source === "vault") return false;
  if (source === "database") return true;
  return databaseConfigured();
}

async function readDatabaseNotesOrNull() {
  if (!databaseConfigured() || !prefersDatabase()) return null;
  try {
    const notes = await getDatabaseNoteMetas();
    return notes.length > 0 ? notes : null;
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Database content source unavailable, falling back to local vault: ${message}`);
    }
    return null;
  }
}

async function readDatabaseAssetsOrNull() {
  if (!databaseConfigured() || !prefersDatabase()) return null;
  try {
    const assets = await getDatabaseAssets();
    return assets.length > 0 ? assets : null;
  } catch {
    return null;
  }
}

export const getAllNotes = cache(async () => {
  return (await readDatabaseNotesOrNull()) ?? getVaultNotes();
});

export async function getRecentNotes(limit = 8) {
  if (!prefersDatabase()) return getVaultRecentNotes(limit);
  return (await getAllNotes()).slice(0, limit);
}

export async function getPublishedNotes() {
  if (!prefersDatabase()) return getVaultPublishedNotes();
  return (await getAllNotes()).filter((note) => note.published || note.type === "blog");
}

export async function getNoteBySlug(slugSegments: string[]) {
  if (!prefersDatabase()) return getVaultNoteBySlug(slugSegments);
  const slug = decodeRouteSegments(slugSegments).join("/");
  try {
    return await getDatabaseNoteBySlug(slug);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Database note lookup unavailable, falling back to local vault: ${message}`);
    }
    return getVaultNoteBySlug(slugSegments);
  }
}

export async function getRelatedNotes(note: Note, limit = 3) {
  if (!prefersDatabase()) return getVaultRelatedNotes(note, limit);
  const notes = await getAllNotes();
  const tagSet = new Set(note.tags);

  return notes
    .filter((candidate) => candidate.slug !== note.slug)
    .map((candidate) => ({
      note: candidate,
      score:
        candidate.tags.filter((tag) => tagSet.has(tag)).length +
        (note.backlinks.includes(candidate.slug) ? 2 : 0) +
        (note.links.some((link) => resolveNoteFromList(link, notes)?.slug === candidate.slug) ? 2 : 0)
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.note);
}

export async function resolveWikiLink(target: string) {
  if (!prefersDatabase()) return resolveVaultWikiLink(target);
  return resolveNoteFromList(target, await getAllNotes());
}

export function resolveWikiLinkFromNotes(target: string, notes: Note[]) {
  return resolveNoteFromList(target, notes);
}

export async function getKnowledgeTree() {
  if (!prefersDatabase()) return getVaultKnowledgeTree();
  const groups = new Map<string, NoteMeta[]>();

  for (const note of await getAllNotes()) {
    const key = note.directory || "Root";
    groups.set(key, [...(groups.get(key) ?? []), note]);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b, "zh-CN"))
    .map(([directory, notes]) => ({ directory, notes }));
}

export async function getGraphData(limit = 80) {
  if (!prefersDatabase()) return getVaultGraphData(limit);
  const notes = (await getAllNotes()).slice(0, limit);
  const noteSet = new Set(notes.map((note) => note.slug));
  const links = notes.flatMap((note) =>
    note.links
      .map((target) => resolveNoteFromList(target, notes))
      .filter((target): target is Note => Boolean(target && noteSet.has(target.slug)))
      .map((target) => ({ source: note.slug, target: target.slug }))
  );

  return {
    nodes: notes.map((note) => ({ id: note.slug, title: note.title, group: note.directory || "Root" })),
    links
  };
}

function resolveAssetFromList(target: string, assets: AssetRecord[], fromRelativePath?: string) {
  const clean = target.split("|")[0].trim();
  const direct = path.posix.normalize(path.posix.join(fromRelativePath ? path.posix.dirname(fromRelativePath) : "", clean));
  const byPath = assets.find((asset) => asset.relativePath === direct || asset.relativePath === clean);
  if (byPath) return byPath;

  const sameDirectoryAsset = fromRelativePath
    ? assets.find(
        (asset) =>
          path.posix.basename(asset.relativePath) === clean &&
          path.posix.dirname(asset.relativePath) === path.posix.dirname(fromRelativePath)
      )
    : undefined;
  if (sameDirectoryAsset) return sameDirectoryAsset;

  return assets.find((asset) => path.posix.basename(asset.relativePath) === path.posix.basename(clean)) ?? null;
}

export async function resolveAsset(target: string, fromRelativePath?: string) {
  if (!prefersDatabase()) return resolveVaultAsset(target, fromRelativePath);
  const assets = (await readDatabaseAssetsOrNull()) ?? [];
  return resolveAssetFromList(target, assets, fromRelativePath);
}

export function assetUrl(asset: AssetRecord) {
  if (asset.absolutePath.startsWith("http") || asset.absolutePath.startsWith("/")) {
    return asset.absolutePath;
  }
  return `/api/assets/${asset.relativePath.split("/").map(encodeURIComponent).join("/")}`;
}

export async function getMarkdownContext(notes: Note[]): Promise<MarkdownContext> {
  if (!prefersDatabase()) {
    return {
      resolveWikiLink: (target) => resolveVaultWikiLink(target) ?? null,
      resolveAsset: (target, fromRelativePath) => resolveVaultAsset(target, fromRelativePath)
    };
  }

  const assets = (await readDatabaseAssetsOrNull()) ?? [];
  return {
    resolveWikiLink: (target) => resolveNoteFromList(target, notes),
    resolveAsset: (target, fromRelativePath) => resolveAssetFromList(target, assets, fromRelativePath),
    assetUrl
  };
}
