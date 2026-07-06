"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, ExternalLink, FileCheck2, LayoutDashboard, RefreshCw, Settings } from "lucide-react";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { cn } from "@/lib/utils";

const adminNav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/sync", label: "Knowledge Sync", icon: RefreshCw },
  { href: "/admin/publish", label: "Blog Publish", icon: FileCheck2 },
  { href: "/admin/ai-config", label: "AI Config", icon: Bot },
  { href: "/admin/settings", label: "Settings", icon: Settings }
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-card/35 lg:block">
        <div className="flex h-16 items-center border-b border-border px-5">
          <Link href="/admin" className="grid gap-0.5">
            <span className="text-sm font-semibold">Admin Console</span>
            <span className="text-xs text-muted-foreground">Sync / Publish / Config</span>
          </Link>
        </div>
        <nav className="grid gap-1 p-3">
          {adminNav.map((item) => {
            const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  active && "bg-muted text-foreground"
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/admin" className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground lg:hidden">
              Admin
            </Link>
            <nav className="hidden items-center gap-1 sm:flex lg:hidden">
              {adminNav.slice(1).map((item) => (
                <Link key={item.href} href={item.href} className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex h-8 items-center gap-2 rounded-md border border-border px-3 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ExternalLink className="size-3.5" />
              View site
            </Link>
            <ThemeToggle />
          </div>
        </header>
        <div className="min-h-[calc(100vh-3.5rem)]">{children}</div>
      </div>
    </div>
  );
}
