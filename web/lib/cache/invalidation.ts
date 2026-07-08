import "server-only";

import { revalidatePath, revalidateTag } from "next/cache";
import { clearRuntimeCache } from "./runtime-cache";

function safeInvalidate(action: () => void) {
  try {
    action();
  } catch {
    // Scripts and some background contexts do not always have Next's cache store.
  }
}

export function invalidateAdminCache() {
  clearRuntimeCache("admin:");
  clearRuntimeCache("site:");
  clearRuntimeCache("ai:");
  safeInvalidate(() => revalidateTag("admin"));
  safeInvalidate(() => revalidatePath("/admin"));
  safeInvalidate(() => revalidatePath("/admin/sync"));
  safeInvalidate(() => revalidatePath("/admin/settings"));
  safeInvalidate(() => revalidatePath("/admin/ai-config"));
}

export function invalidateContentCache() {
  clearRuntimeCache("content:");
  clearRuntimeCache("projects:");
  clearRuntimeCache("site:");
  clearRuntimeCache("ai:");
  safeInvalidate(() => revalidateTag("content"));
  safeInvalidate(() => revalidateTag("assets"));
  safeInvalidate(() => revalidateTag("projects"));
  safeInvalidate(() => revalidateTag("site"));
  safeInvalidate(() => revalidatePath("/", "layout"));
  safeInvalidate(() => revalidatePath("/"));
  safeInvalidate(() => revalidatePath("/knowledge"));
  safeInvalidate(() => revalidatePath("/blog"));
  safeInvalidate(() => revalidatePath("/projects"));
  safeInvalidate(() => revalidatePath("/projects/[slug]", "page"));
  safeInvalidate(() => revalidatePath("/ai"));
  safeInvalidate(() => revalidatePath("/about"));
  safeInvalidate(() => revalidatePath("/rss.xml"));
}
