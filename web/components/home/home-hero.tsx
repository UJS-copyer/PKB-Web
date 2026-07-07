"use client";

import { ArrowRight, Search } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SiteSettings } from "@/lib/site-settings-types";

export function HomeHero({ settings }: { settings: SiteSettings }) {
  return (
    <section className="content-grid border-b border-border">
      <div className="grid min-h-[620px] items-center gap-12 py-14 lg:min-h-[calc(78vh-4rem)] lg:grid-cols-[1fr_360px] lg:py-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        >
          <Badge variant="accent" className="mb-6 font-mono uppercase tracking-[0.24em]">
            Obsidian Native Garden
          </Badge>
          <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-balance sm:text-6xl lg:text-7xl">
            {settings.slogan}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
            {settings.description}
          </p>

          <form action="/knowledge" className="mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="q"
                aria-label="搜索笔记、项目、技术关键词"
                className="h-12 rounded-full border-border/80 bg-card/60 pl-11"
                placeholder="搜索笔记、项目、技术关键词..."
              />
            </div>
            <Button type="submit" size="lg" className="rounded-full">
              Explore
              <ArrowRight className="size-4" />
            </Button>
          </form>

          <div className="mt-8 flex flex-wrap gap-2">
            {settings.skills.map((skill) => (
              <Badge key={skill} variant="outline" className="rounded-full font-mono">
                {skill}
              </Badge>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.65, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto w-full max-w-sm"
        >
          <div className="absolute -inset-8 rounded-full border border-accent/20 opacity-60" />
          <div className="relative overflow-hidden rounded-lg border border-border bg-card p-4">
            <div
              aria-label={`${settings.name} avatar`}
              role="img"
              className="aspect-square w-full rounded-md bg-muted bg-cover bg-center"
              style={{ backgroundImage: `url("${settings.avatar}")` }}
            />
            <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Always syncing
              </span>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-accent" />
                </span>
                Online
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
