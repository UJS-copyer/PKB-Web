import { getPublishedNotes } from "@/lib/content/source";

export const revalidate = 60;

export async function GET() {
  const posts = await getPublishedNotes();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";
  const items = posts
    .map((post) => {
      const href = `${baseUrl}/blog/${post.slugSegments.map(encodeURIComponent).join("/")}`;
      return `<item><title><![CDATA[${post.title}]]></title><link>${href}</link><guid>${href}</guid><description><![CDATA[${post.excerpt}]]></description><pubDate>${new Date(post.updatedAt).toUTCString()}</pubDate></item>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Rainbell Digital Garden</title><link>${baseUrl}</link><description>Obsidian powered digital garden</description>${items}</channel></rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8"
    }
  });
}
