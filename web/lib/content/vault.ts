import "server-only";

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { idFromHeading } from "./heading-id";

const markdownExtension = ".md";
export const assetExtensions = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".tif",
  ".tiff"
]);

export type NoteDisplayMeta = {
  displayDate?: string;
  displayDateLabel: "更新" | "创建" | "同步" | "未设置日期";
  sortDate: string;
  hasExplicitDate: boolean;
};

export type NoteMeta = NoteDisplayMeta & {
  title: string;
  aliases: string[];
  slug: string;
  slugSegments: string[];
  href: string;
  relativePath: string;
  directory: string;
  tags: string[];
  category?: string;
  description?: string;
  cover?: string;
  published: boolean;
  visibility: "public" | "private" | "unlisted";
  featured: boolean;
  type: "note" | "blog" | "project";
  createdAt: string;
  updatedAt: string;
  excerpt: string;
  links: string[];
  backlinks: string[];
  readingMinutes: number;
};

export type Note = NoteMeta & {
  content: string;
  raw: string;
  headings: Array<{ depth: number; text: string; id: string }>;
};

export type AssetRecord = {
  name: string;
  relativePath: string;
  absolutePath: string;
};

type VaultIndex = {
  root: string;
  notes: Note[];
  assets: AssetRecord[];
  titleToNote: Map<string, Note>;
  pathToNote: Map<string, Note>;
  assetByName: Map<string, AssetRecord[]>;
};

function getVaultRoot() {
  return path.resolve(process.env.OBSIDIAN_VAULT_PATH ?? path.join(process.cwd(), "..", "obsidian"));
}

function normalizePath(input: string) {
  return input.split(path.sep).join("/");
}

function walkFiles(root: string) {
  if (!fs.existsSync(root)) {
    return [];
  }

  const results: string[] = [];
  const stack = [root];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;

    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name === ".git" || entry.name === ".obsidian" || entry.name === "node_modules") {
        continue;
      }

      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absolute);
      } else if (entry.isFile()) {
        results.push(absolute);
      }
    }
  }

  return results;
}

function asArray(value: unknown) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(/[,\s]+/)
      .map((item) => item.replace(/^#/, "").trim())
      .filter(Boolean);
  }
  return [];
}

function stripFencedCodeBlocks(input: string) {
  return input.replace(/```[\s\S]*?```/g, " ").replace(/~~~[\s\S]*?~~~/g, " ");
}

function stripMarkdown(input: string) {
  return input
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[\[[^\]]+\]\]/g, " ")
    .replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g, "$2$1")
    .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/[#>*_`~=|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function excerptFrom(content: string) {
  const text = stripMarkdown(content);
  return text.length > 140 ? `${text.slice(0, 140)}...` : text;
}

function extractTags(content: string, frontmatterTags: string[]) {
  const inlineTags = Array.from(stripFencedCodeBlocks(content).matchAll(/(^|\s)#([\p{Letter}\p{Number}_/-]+)/gu)).map(
    (match) => match[2]
  );
  return Array.from(new Set([...frontmatterTags, ...inlineTags])).filter(Boolean).slice(0, 12);
}

function extractLinks(content: string) {
  const matches = Array.from(content.matchAll(/!?\[\[([^\]]+)\]\]/g));
  return Array.from(
    new Set(
      matches
        .map((match) => match[1].split("|")[0].split("#")[0].trim())
        .filter(Boolean)
    )
  );
}

function slugFromRelativePath(relativePath: string) {
  return relativePath.replace(/\.md$/i, "");
}

function titleFromRelativePath(relativePath: string) {
  return path.basename(relativePath, ".md");
}

function firstHeading(content: string) {
  const match = stripFencedCodeBlocks(content).match(/^#\s+(.+)$/m);
  return match?.[1]?.trim();
}

function frontmatterTitle(value: unknown) {
  const title = value === undefined || value === null ? "" : String(value).trim();
  return title || undefined;
}

function uniqueStrings(values: Array<string | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value))));
}

export function decodeRouteSegments(slugSegments: string[]) {
  return slugSegments.map((segment) => {
    try {
      return decodeURIComponent(segment);
    } catch {
      return segment;
    }
  });
}

function extractHeadings(content: string) {
  return Array.from(stripFencedCodeBlocks(content).matchAll(/^(#{1,4})\s+(.+)$/gm)).map((match) => ({
    depth: match[1].length,
    text: match[2].trim(),
    id: idFromHeading(match[2])
  }));
}

function dateFromStats(stats: fs.Stats) {
  return stats.mtime.toISOString();
}

function safeIsoDate(value: unknown) {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function frontmatterDate(data: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = safeIsoDate(data[key]);
    if (value) return value;
  }
  return undefined;
}

function frontmatterVisibility(value: unknown): NoteMeta["visibility"] {
  const visibility = String(value ?? "public").trim().toLowerCase();
  return visibility === "private" || visibility === "unlisted" ? visibility : "public";
}

export function parseNoteFromRaw(input: {
  relativePath: string;
  raw: string;
  createdAt?: string;
  updatedAt?: string;
}) {
  const parsed = matter(input.raw);
  const data = parsed.data;
  const slug = slugFromRelativePath(input.relativePath);
  const fallbackDate = safeIsoDate(input.updatedAt) ?? safeIsoDate(input.createdAt) ?? new Date().toISOString();
  const explicitUpdatedAt = frontmatterDate(data, ["updatedAt", "updated", "modified", "date"]);
  const explicitCreatedAt = frontmatterDate(data, ["createdAt", "created", "created_at", "date"]);
  const createdAt = explicitCreatedAt ?? safeIsoDate(input.createdAt) ?? fallbackDate;
  const updatedAt = explicitUpdatedAt ?? safeIsoDate(input.updatedAt) ?? fallbackDate;
  const displayDate = explicitUpdatedAt ?? explicitCreatedAt;
  const fileTitle = titleFromRelativePath(input.relativePath);
  const headingTitle = firstHeading(parsed.content);
  const title = frontmatterTitle(data.title) ?? fileTitle;
  const published = Boolean(data.published ?? data.publish ?? data.public ?? false);
  const visibility = frontmatterVisibility(data.visibility);
  const type = String(data.type ?? (published ? "blog" : "note")) as NoteMeta["type"];
  const tags = extractTags(parsed.content, asArray(data.tags));
  const readingMinutes = Math.max(1, Math.ceil(stripMarkdown(parsed.content).length / 500));

  return {
    title,
    aliases: uniqueStrings([fileTitle, headingTitle]).filter((alias) => alias !== title),
    slug,
    slugSegments: slug.split("/"),
    href: `/knowledge/${slug.split("/").map(encodeURIComponent).join("/")}`,
    relativePath: input.relativePath,
    directory: normalizePath(path.dirname(input.relativePath)).replace(/^\.$/, ""),
    tags,
    category: data.category ? String(data.category) : undefined,
    description: data.description ? String(data.description) : undefined,
    cover: data.cover ? String(data.cover) : undefined,
    published,
    visibility,
    featured: Boolean(data.featured ?? false),
    type,
    createdAt,
    updatedAt,
    displayDate,
    displayDateLabel: explicitUpdatedAt ? "更新" : explicitCreatedAt ? "创建" : "同步",
    sortDate: displayDate ?? updatedAt,
    hasExplicitDate: Boolean(displayDate),
    excerpt: excerptFrom(parsed.content),
    links: extractLinks(parsed.content),
    backlinks: [] as string[],
    readingMinutes,
    content: parsed.content,
    raw: input.raw,
    headings: extractHeadings(parsed.content)
  } satisfies Note;
}

export function populateBacklinks(notes: Note[]) {
  const titleToNote = new Map<string, Note>();
  const pathToNote = new Map<string, Note>();

  for (const note of notes) {
    titleToNote.set(note.title, note);
    for (const alias of note.aliases) {
      titleToNote.set(alias, note);
    }
    titleToNote.set(path.basename(note.relativePath, ".md"), note);
    pathToNote.set(note.slug, note);
    pathToNote.set(note.relativePath, note);
  }

  for (const note of notes) {
    note.backlinks = notes
      .filter((candidate) => candidate.slug !== note.slug)
      .filter((candidate) =>
        candidate.links.some((link) => {
          const target = resolveNote(link, titleToNote, pathToNote);
          return target?.slug === note.slug;
        })
      )
      .map((candidate) => candidate.slug);
  }

  return { titleToNote, pathToNote };
}

function buildIndex(): VaultIndex {
  const root = getVaultRoot();
  const files = walkFiles(root);
  const markdownFiles = files.filter((file) => path.extname(file).toLowerCase() === markdownExtension);
  const assets = files
    .filter((file) => assetExtensions.has(path.extname(file).toLowerCase()))
    .map((absolutePath) => {
      const relativePath = normalizePath(path.relative(root, absolutePath));
      return {
        name: path.basename(absolutePath),
        relativePath,
        absolutePath
      };
    });

  const notes = markdownFiles.map((absolutePath) => {
    const raw = fs.readFileSync(absolutePath, "utf8");
    const relativePath = normalizePath(path.relative(root, absolutePath));
    const stats = fs.statSync(absolutePath);
    const updatedAt = dateFromStats(stats);

    return parseNoteFromRaw({
      relativePath,
      raw,
      createdAt: updatedAt,
      updatedAt
    });
  });

  const { titleToNote, pathToNote } = populateBacklinks(notes);

  const assetByName = new Map<string, AssetRecord[]>();
  for (const asset of assets) {
    const existing = assetByName.get(asset.name) ?? [];
    existing.push(asset);
    assetByName.set(asset.name, existing);
  }

  return { root, notes, assets, titleToNote, pathToNote, assetByName };
}

let cachedIndex: VaultIndex | null = null;

export function getVaultIndex() {
  cachedIndex ??= buildIndex();
  return cachedIndex;
}

function resolveNote(target: string, titleToNote: Map<string, Note>, pathToNote: Map<string, Note>) {
  const clean = target.replace(/\.md$/i, "").trim();
  return (
    titleToNote.get(clean) ??
    pathToNote.get(clean) ??
    pathToNote.get(`${clean}.md`) ??
    titleToNote.get(path.basename(clean))
  );
}

export function getAllNotes() {
  return [...getVaultIndex().notes].sort(
    (a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime()
  );
}

export function getRecentNotes(limit = 8) {
  return getAllNotes().slice(0, limit);
}

export function getPublishedNotes() {
  return getAllNotes().filter((note) => note.visibility === "public" && (note.published || note.type === "blog"));
}

export function getNoteBySlug(slugSegments: string[]) {
  const slug = decodeRouteSegments(slugSegments).join("/");
  return getVaultIndex().pathToNote.get(slug) ?? null;
}

export function getRelatedNotes(note: Note, limit = 3) {
  const tagSet = new Set(note.tags);
  return getAllNotes()
    .filter((candidate) => candidate.slug !== note.slug)
    .map((candidate) => ({
      note: candidate,
      score:
        candidate.tags.filter((tag) => tagSet.has(tag)).length +
        (note.backlinks.includes(candidate.slug) ? 2 : 0) +
        (note.links.some((link) => resolveWikiLink(link)?.slug === candidate.slug) ? 2 : 0)
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.note);
}

export function resolveWikiLink(target: string) {
  const index = getVaultIndex();
  return resolveNote(target, index.titleToNote, index.pathToNote);
}

export function resolveAsset(target: string, fromRelativePath?: string) {
  const index = getVaultIndex();
  const clean = target.split("|")[0].trim();
  const direct = path
    .normalize(path.join(fromRelativePath ? path.dirname(fromRelativePath) : "", clean))
    .split(path.sep)
    .join("/");
  const byPath = index.assets.find((asset) => asset.relativePath === direct || asset.relativePath === clean);
  if (byPath) return byPath;

  const sameDirectoryAsset = fromRelativePath
    ? index.assets.find(
        (asset) =>
          path.basename(asset.relativePath) === clean &&
          path.dirname(asset.relativePath) === path.dirname(fromRelativePath)
      )
    : undefined;
  if (sameDirectoryAsset) return sameDirectoryAsset;

  return index.assetByName.get(path.basename(clean))?.[0] ?? null;
}

export function assetUrl(relativePath: string) {
  return `/api/assets/${relativePath.split("/").map(encodeURIComponent).join("/")}`;
}

export function getKnowledgeTree() {
  const groups = new Map<string, NoteMeta[]>();
  for (const note of getAllNotes()) {
    const key = note.directory || "Root";
    groups.set(key, [...(groups.get(key) ?? []), note]);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b, "zh-CN"))
    .map(([directory, notes]) => ({ directory, notes }));
}

export function getGraphData(limit = 80) {
  const notes = getAllNotes().slice(0, limit);
  const noteSet = new Set(notes.map((note) => note.slug));
  const links = notes.flatMap((note) =>
    note.links
      .map((target) => resolveWikiLink(target))
      .filter((target): target is Note => Boolean(target && noteSet.has(target.slug)))
      .map((target) => ({ source: note.slug, target: target.slug }))
  );

  return {
    nodes: notes.map((note) => ({ id: note.slug, title: note.title, group: note.directory || "Root" })),
    links
  };
}
