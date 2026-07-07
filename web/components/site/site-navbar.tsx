"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search } from "lucide-react";
import { PendingLink } from "@/components/navigation/route-progress";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";
import { siteConfig } from "@/lib/site-config";
import type { SiteSettings } from "@/lib/site-settings-types";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";

export function SiteNavbar({ settings }: { settings: SiteSettings }) {
  const pathname = usePathname();
  const publicNav = siteConfig.nav.filter((item) => item.href !== "/admin" && item.href !== "/about");

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/82 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex min-w-0 items-center gap-3">
          <span className="size-2 rounded-full bg-accent transition-transform group-hover:scale-150" />
          <span className="font-mono text-xs uppercase tracking-[0.24em] text-muted-foreground">
            {settings.name}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {publicNav.map((item, index) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group relative rounded-md px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground",
                  active && "text-foreground"
                )}
              >
                <span className="mr-1 text-accent/80">{String(index + 1).padStart(2, "0")}</span>
                {item.label}
                <span
                  className={cn(
                    "absolute inset-x-3 -bottom-px h-px origin-left scale-x-0 bg-foreground transition-transform group-hover:scale-x-100",
                    active && "scale-x-100"
                  )}
                />
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Button asChild variant="outline" size="sm" className="rounded-full font-mono text-xs">
            <PendingLink href="/knowledge">
              <Search className="size-3.5" />
              Search
            </PendingLink>
          </Button>
          <ThemeToggle />
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Open menu">
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>{settings.title}</SheetTitle>
              </SheetHeader>
              <div className="mt-8 grid gap-2">
                {publicNav.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <SheetClose asChild key={item.href}>
                      <Link
                        href={item.href}
                        className="flex items-center justify-between rounded-md border border-border px-4 py-3 text-sm transition-colors hover:bg-muted"
                      >
                        <span className="flex items-center gap-3">
                          <Icon className="size-4 text-accent" />
                          {item.label}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                      </Link>
                    </SheetClose>
                  );
                })}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
