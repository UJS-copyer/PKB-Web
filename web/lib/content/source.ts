import "server-only";

import path from "node:path";
import { cache } from "react";
import { databaseConfigured } from "@/lib/db/prisma";
import { prepareMarkdown, type MarkdownContext } from "./markdown";
import {
  decodeRouteSegments,
  getAllNotes as getVaultNotes,
  getGraphData as getVaultGraphData,
  getNoteBySlug as getVaultNoteBySlug,
  getPublishedNotes as getVaultPublishedNotes,
  resolveAsset as resolveVaultAsset,
  resolveWikiLink as resolveVaultWikiLink,
  type AssetRecord,
  type Note,
  type NoteMeta
} from "./vault";
import { getDatabaseAdminNoteMetas, getDatabaseAssets, getDatabaseNoteBySlug, getDatabaseNoteMetas, resolveNoteFromList } from "./database";

export { decodeRouteSegments };
export type { AssetRecord, Note, NoteMeta };

export type KnowledgeTreeNode = {
  type: "folder";
  name: string;
  path: string;
  children: KnowledgeTreeNode[];
  notes: NoteMeta[];
  count: number;
};

export type NoteDateDisplay = {
  displayDate: string;
  displayDateLabel: NoteMeta["displayDateLabel"];
  sortDate: string;
};

export type NotePageData = {
  note: Note;
  allNotes: NoteMeta[];
  content: string;
  backlinks: NoteMeta[];
  related: NoteMeta[];
  linkedNotes: NoteMeta[];
  date: NoteDateDisplay;
};

function prefersDatabase() {
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
  const notes = (await readDatabaseNotesOrNull()) ?? getVaultNotes();
  return [...notes].filter((note) => note.visibility === "public").sort((a, b) => dateValue(b) - dateValue(a));
});

export async function getAdminNotes(limit = 50) {
  if (databaseConfigured() && prefersDatabase()) {
    try {
      return await getDatabaseAdminNoteMetas(limit);
    } catch {
      return getVaultNotes().slice(0, limit);
    }
  }
  return getVaultNotes().slice(0, limit);
}

export async function getRecentNotes(limit = 8) {
  return (await getAllNotes()).slice(0, limit);
}

export async function getPublishedNotes() {
  if (!prefersDatabase()) return getVaultPublishedNotes();
  return (await getAllNotes()).filter((note) => note.visibility === "public" && (note.published || note.type === "blog"));
}

export async function getNoteBySlug(slugSegments: string[]) {
  if (!prefersDatabase()) {
    const note = getVaultNoteBySlug(slugSegments);
    return note?.visibility === "public" ? note : null;
  }
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
  const notes = await getAllNotes();
  const resolve = createNoteResolver(notes);
  const tagSet = new Set(note.tags);

  return notes
    .filter((candidate) => candidate.slug !== note.slug)
    .map((candidate) => ({
      note: candidate,
      score:
        candidate.tags.filter((tag) => tagSet.has(tag)).length +
        (note.backlinks.includes(candidate.slug) ? 2 : 0) +
        (note.links.some((link) => resolve(link)?.slug === candidate.slug) ? 2 : 0)
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

export function resolveWikiLinkFromNotes(target: string, notes: NoteMeta[]) {
  return createNoteResolver(notes)(target);
}

export async function getKnowledgeTree() {
  const groups = new Map<string, NoteMeta[]>();

  for (const note of await getAllNotes()) {
    const key = note.directory || "Root";
    groups.set(key, [...(groups.get(key) ?? []), note]);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b, "zh-CN"))
    .map(([directory, notes]) => ({ directory, notes }));
}

export async function getKnowledgeTreeNodes() {
  return buildKnowledgeTree(await getAllNotes());
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

export async function getMarkdownContext(notes: NoteMeta[]): Promise<MarkdownContext> {
  if (!prefersDatabase()) {
    return {
      resolveWikiLink: (target) => resolveVaultWikiLink(target) ?? null,
      resolveAsset: (target, fromRelativePath) => resolveVaultAsset(target, fromRelativePath)
    };
  }

  const assets = (await readDatabaseAssetsOrNull()) ?? [];
  const resolve = createNoteResolver(notes);
  return {
    resolveWikiLink: (target) => resolve(target),
    resolveAsset: (target, fromRelativePath) => resolveAssetFromList(target, assets, fromRelativePath),
    assetUrl
  };
}

export const getNotePageData = cache(async (slugSegments: string[]): Promise<NotePageData | null> => {
  const note = await getNoteBySlug(slugSegments);
  if (!note) return null;

  const allNotes = await getAllNotes();
  const notesBySlug = new Map(allNotes.map((item) => [item.slug, item]));
  const resolve = createNoteResolver(allNotes);
  const tagSet = new Set(note.tags);

  const related = allNotes
    .filter((candidate) => candidate.slug !== note.slug)
    .map((candidate) => ({
      note: candidate,
      score:
        candidate.tags.filter((tag) => tagSet.has(tag)).length +
        (note.backlinks.includes(candidate.slug) ? 2 : 0) +
        (note.links.some((link) => resolve(link)?.slug === candidate.slug) ? 2 : 0)
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || naturalCompare(a.note.title, b.note.title))
    .slice(0, 5)
    .map((item) => item.note);

  const backlinks = note.backlinks
    .map((slug) => notesBySlug.get(slug))
    .filter((item): item is Note => Boolean(item))
    .slice(0, 12);

  const relatedSlugs = new Set(related.map((item) => item.slug));
  const linkedNotes = uniqueNotes(
    note.links
      .map((target) => resolve(target))
      .filter((item): item is NoteMeta => Boolean(item && item.slug !== note.slug && !relatedSlugs.has(item.slug)))
  ).slice(0, 8);

  const context = await getMarkdownContext(allNotes);
  const content = prepareMarkdown(note.content, note.relativePath, context);

  return {
    note,
    allNotes,
    content,
    backlinks,
    related,
    linkedNotes,
    date: formatNoteDate(note)
  };
});

function dateValue(note: Pick<NoteMeta, "sortDate" | "updatedAt">) {
  const value = new Date(note.sortDate ?? note.updatedAt).getTime();
  return Number.isNaN(value) ? 0 : value;
}

export function formatNoteDate(note: Pick<NoteMeta, "displayDate" | "displayDateLabel" | "sortDate" | "updatedAt">): NoteDateDisplay {
  const source = note.displayDate ?? note.sortDate ?? note.updatedAt;
  const date = new Date(source);
  if (Number.isNaN(date.getTime())) {
    return {
      displayDate: "未设置日期",
      displayDateLabel: "未设置日期",
      sortDate: ""
    };
  }

  return {
    displayDate: date.toISOString().slice(0, 10),
    displayDateLabel: note.displayDateLabel ?? "同步",
    sortDate: date.toISOString()
  };
}

function naturalCompare(a: string, b: string) {
  return a.localeCompare(b, "zh-CN", {
    numeric: true,
    sensitivity: "base"
  });
}

function sortNotesByFileName(notes: NoteMeta[]) {
  return [...notes].sort((a, b) =>
    naturalCompare(path.posix.basename(a.relativePath, ".md"), path.posix.basename(b.relativePath, ".md"))
  );
}

function buildKnowledgeTree(notes: NoteMeta[]): KnowledgeTreeNode[] {
  const roots: KnowledgeTreeNode[] = [];
  const folders = new Map<string, KnowledgeTreeNode>();

  for (const note of notes) {
    const segments = note.directory ? note.directory.split("/").filter(Boolean) : [];
    let currentPath = "";
    let level = roots;

    for (const segment of segments) {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      let folder = folders.get(currentPath);
      if (!folder) {
        folder = {
          type: "folder",
          name: segment,
          path: currentPath,
          children: [],
          notes: [],
          count: 0
        };
        folders.set(currentPath, folder);
        level.push(folder);
      }
      level = folder.children;
    }

    const folder = segments.length > 0 ? folders.get(segments.join("/")) : undefined;
    if (folder) {
      folder.notes.push(note);
    } else {
      let root = folders.get("Root");
      if (!root) {
        root = { type: "folder", name: "Root", path: "", children: [], notes: [], count: 0 };
        folders.set("Root", root);
        roots.push(root);
      }
      root.notes.push(note);
    }
  }

  function sortAndCount(nodes: KnowledgeTreeNode[]) {
    nodes.sort((a, b) => naturalCompare(a.name, b.name));
    for (const node of nodes) {
      node.children = sortAndCount(node.children);
      node.notes = sortNotesByFileName(node.notes);
      node.count = node.notes.length + node.children.reduce((sum, child) => sum + child.count, 0);
    }
    return nodes;
  }

  return sortAndCount(roots);
}

function createNoteResolver(notes: NoteMeta[]) {
  const titleToNote = new Map<string, NoteMeta>();
  const pathToNote = new Map<string, NoteMeta>();

  for (const note of notes) {
    titleToNote.set(note.title, note);
    for (const alias of note.aliases) {
      titleToNote.set(alias, note);
    }
    titleToNote.set(path.posix.basename(note.relativePath, ".md"), note);
    pathToNote.set(note.slug, note);
    pathToNote.set(note.relativePath, note);
  }

  return (target: string) => {
    const clean = target.replace(/\.md$/i, "").trim();
    return (
      titleToNote.get(clean) ??
      pathToNote.get(clean) ??
      pathToNote.get(`${clean}.md`) ??
      titleToNote.get(path.posix.basename(clean)) ??
      null
    );
  };
}

function uniqueNotes(notes: NoteMeta[]) {
  const seen = new Set<string>();
  return notes.filter((note) => {
    if (seen.has(note.slug)) return false;
    seen.add(note.slug);
    return true;
  });
}
