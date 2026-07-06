import "server-only";

import {
  assetUrl as vaultAssetUrl,
  idFromHeading,
  resolveAsset as resolveVaultAsset,
  resolveWikiLink as resolveVaultWikiLink,
  type AssetRecord,
  type Note
} from "./vault";

export type MarkdownContext = {
  resolveWikiLink?: (target: string) => Pick<Note, "href" | "title"> | null;
  resolveAsset?: (target: string, fromRelativePath?: string) => AssetRecord | null;
  assetUrl?: (asset: AssetRecord) => string;
};

function defaultAssetUrl(asset: AssetRecord) {
  if (asset.absolutePath.startsWith("http") || asset.absolutePath.startsWith("/")) {
    return asset.absolutePath;
  }
  return vaultAssetUrl(asset.relativePath);
}

function normalizeObsidianImage(value: string, fromRelativePath: string, context: MarkdownContext) {
  const [target, width] = value.split("|").map((item) => item.trim());
  const asset = (context.resolveAsset ?? resolveVaultAsset)(target, fromRelativePath);
  if (!asset) {
    return `![${target}](${target})`;
  }

  const size = width && /^\d+$/.test(width) ? ` width="${width}"` : "";
  const src = (context.assetUrl ?? defaultAssetUrl)(asset);
  return `<img src="${src}" alt="${target}"${size} />`;
}

function normalizeObsidianLink(value: string, context: MarkdownContext) {
  const [targetWithHeading, alias] = value.split("|").map((item) => item.trim());
  const [target, heading] = targetWithHeading.split("#").map((item) => item.trim());
  const note = (context.resolveWikiLink ?? resolveVaultWikiLink)(target);
  const label = alias || heading || target;
  if (!note) {
    return `[${label}](/knowledge?missing=${encodeURIComponent(target)})`;
  }

  const hash = heading ? `#${idFromHeading(heading)}` : "";
  return `[${label}](${note.href}${hash})`;
}

function normalizeCallouts(markdown: string) {
  return markdown.replace(/^>\s+\[!(\w+)]\s*(.*)$/gm, (_, type: string, title: string) => {
    const label = title || type;
    return `> **${label}**`;
  });
}

export function prepareMarkdown(markdown: string, fromRelativePath: string, context: MarkdownContext = {}) {
  return normalizeCallouts(markdown.replace(/\u200b/g, ""))
    .replace(/!\[\[([^\]]+)\]\]/g, (_, value: string) => normalizeObsidianImage(value, fromRelativePath, context))
    .replace(/\[\[([^\]]+)\]\]/g, (_, value: string) => normalizeObsidianLink(value, context))
    .replace(/==([^=\n]+)==/g, "<mark>$1</mark>");
}
