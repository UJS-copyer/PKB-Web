import matter from "gray-matter";

export type PublishFields = {
  published?: boolean;
  featured?: boolean;
  slug?: string;
  cover?: string;
  category?: string;
};

export function updateFrontmatter(raw: string, fields: PublishFields) {
  const parsed = matter(raw);
  const data = {
    ...parsed.data
  };

  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === "") continue;
    data[key] = value;
  }

  return matter.stringify(parsed.content.trimStart(), data);
}
