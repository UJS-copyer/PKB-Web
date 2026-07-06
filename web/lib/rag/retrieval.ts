import "server-only";

import { getAllNotes } from "@/lib/content/source";

export type RetrievedSource = {
  title: string;
  path: string;
  url: string;
  excerpt: string;
  score: number;
};

function scoreNote(question: string, text: string) {
  const terms = Array.from(new Set(question.toLowerCase().split(/\s+/).filter((term) => term.length > 1)));
  const haystack = text.toLowerCase();
  return terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
}

export async function retrieveLocalSources(question: string, limit = 5): Promise<RetrievedSource[]> {
  const notes = await getAllNotes();
  return notes
    .map((note) => ({
      note,
      score: scoreNote(question, `${note.title}\n${note.excerpt}\n${note.tags.join(" ")}`)
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ note, score }) => ({
      title: note.title,
      path: note.relativePath,
      url: note.href,
      excerpt: note.excerpt,
      score
    }));
}

export function buildRagPrompt(question: string, sources: RetrievedSource[]) {
  const context = sources
    .map((source, index) => `Source ${index + 1}: ${source.title}\nPath: ${source.path}\nExcerpt: ${source.excerpt}`)
    .join("\n\n");

  return `你是基于个人知识库回答问题的助手。必须优先依据引用来源回答；如果来源不足，请明确说明。

用户问题：
${question}

知识库来源：
${context || "未检索到足够来源。"}`;
}
