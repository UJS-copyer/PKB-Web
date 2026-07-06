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
  safeInvalidate(() => revalidateTag("admin"));
  safeInvalidate(() => revalidatePath("/admin"));
  safeInvalidate(() => revalidatePath("/admin/sync"));
  safeInvalidate(() => revalidatePath("/admin/settings"));
}

export function invalidateContentCache() {
  clearRuntimeCache("content:");
  safeInvalidate(() => revalidateTag("content"));
  safeInvalidate(() => revalidateTag("assets"));
  safeInvalidate(() => revalidatePath("/"));
  safeInvalidate(() => revalidatePath("/knowledge"));
  safeInvalidate(() => revalidatePath("/blog"));
  safeInvalidate(() => revalidatePath("/rss.xml"));
}
