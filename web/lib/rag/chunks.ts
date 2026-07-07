import "server-only";

import crypto from "node:crypto";

export type NoteChunkSeed = {
  noteId: string;
  sourcePath: string;
  slug: string;
  title: string;
  content: string;
  excerpt?: string | null;
};

export type RagChunk = {
  noteId: string;
  sourcePath: string;
  slug: string;
  title: string;
  chunkIndex: number;
  content: string;
  excerpt: string;
  contentHash: string;
};

function normalizeWhitespace(value: string) {
  return value.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function stripMarkdown(value: string) {
  return normalizeWhitespace(
    value
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\!\[[^\]]*]\([^)]*\)/g, " ")
      .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
      .replace(/\[\[([^\]]+)]]/g, "$1")
      .replace(/^>\s?/gm, "")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/\*\*|__|\*|_/g, "")
  );
}

function contentHash(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function chunkText(text: string, chunkSize: number, overlap: number) {
  if (text.length <= chunkSize) return [text];

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const maxEnd = Math.min(start + chunkSize, text.length);
    let end = text.lastIndexOf("\n\n", maxEnd);
    if (end <= start + Math.floor(chunkSize * 0.5)) {
      end = text.lastIndexOf(". ", maxEnd);
    }
    if (end <= start + Math.floor(chunkSize * 0.5)) {
      end = text.lastIndexOf("。", maxEnd);
    }
    if (end <= start) {
      end = maxEnd;
    }

    const slice = text.slice(start, end).trim();
    if (slice) chunks.push(slice);
    if (end >= text.length) break;
    start = Math.max(end - overlap, start + 1);
  }

  return chunks;
}

export function buildNoteChunks(note: NoteChunkSeed, chunkSize: number, overlap: number): RagChunk[] {
  const plain = stripMarkdown(note.content);
  if (!plain) return [];

  const seeded = normalizeWhitespace(`${note.title}\n\n${plain}`);
  const parts = chunkText(seeded, chunkSize, overlap);

  return parts.map((part, index) => ({
    noteId: note.noteId,
    sourcePath: note.sourcePath,
    slug: note.slug,
    title: note.title,
    chunkIndex: index,
    content: part,
    excerpt: part.slice(0, 260),
    contentHash: contentHash(`${note.sourcePath}:${index}:${part}`)
  }));
}
