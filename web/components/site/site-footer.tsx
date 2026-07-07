"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { SiteSettings } from "@/lib/site-settings-types";

export function SiteFooter({ settings }: { settings: SiteSettings }) {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1fr_auto] lg:px-8">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-muted-foreground">
            Digital Garden
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            {settings.description}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 md:justify-end">
          {settings.socials.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="group inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
              <ArrowUpRight className="size-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
