import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/motion/reveal";
import { formatNoteDate } from "@/lib/content/source";
import type { NoteMeta } from "@/lib/content/vault";

export function LatestNotes({ notes }: { notes: NoteMeta[] }) {
  return (
    <section className="content-grid border-b border-border">
      <div className="py-16">
        <div className="mb-10 flex items-end justify-between gap-6">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-muted-foreground">
              01 - Recent Notes
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">最近更新</h2>
          </div>
          <Link
            href="/knowledge"
            className="hidden font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
          >
            View all
          </Link>
        </div>
        <div className="grid gap-3">
          {notes.map((note, index) => {
            const date = formatNoteDate(note);
            return (
              <Reveal key={note.slug} delay={index * 0.035}>
                <Link
                  href={note.href}
                  prefetch={false}
                  className="group grid gap-4 rounded-lg border border-border bg-card/40 p-5 transition-colors hover:bg-muted/40 md:grid-cols-[1fr_auto]"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-medium tracking-tight group-hover:text-accent">{note.title}</h3>
                      {note.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="rounded-full">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                      {note.excerpt || note.relativePath}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    <span>
                      {date.displayDateLabel} {date.displayDate}
                    </span>
                    <span>{note.readingMinutes} min</span>
                    <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
