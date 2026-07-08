import Link from "next/link";
import { ArrowUpRight, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SiteSettings } from "@/lib/site-settings-types";

export function HomeAbout({ settings }: { settings: SiteSettings }) {
  const educationLines = settings.education
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <section id="about" className="scroll-mt-24 border-b border-border">
      <div className="mx-auto grid max-w-[1400px] gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8 lg:py-20">
        <div className="max-w-4xl">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-muted-foreground">
            01 - About
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {settings.name}
          </h2>
          <div className="mt-6 space-y-5 text-base leading-8 text-muted-foreground sm:text-lg">
            <p>{settings.bio}</p>
            {educationLines.length > 0 ? (
              <div className="space-y-2">
                {educationLines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            ) : null}
          </div>

          <div className="mt-10 grid gap-6 border-y border-border py-8 md:grid-cols-2">
            <div>
              <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Research
              </h3>
              <p className="mt-3 text-sm leading-7 text-foreground/82">{settings.research}</p>
            </div>
            <div>
              <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Contact
              </h3>
              <div className="mt-3 flex flex-wrap gap-3">
                {settings.resumeUrl ? (
                  <Button asChild size="sm" className="rounded-full">
                    <Link href={settings.resumeUrl}>
                      <Download className="size-4" />
                      简历
                    </Link>
                  </Button>
                ) : null}
                {settings.socials.map((social) => (
                  <Button key={social.label} asChild size="sm" variant="outline" className="rounded-full">
                    <Link href={social.href}>
                      {social.label}
                      <ArrowUpRight className="size-3.5" />
                    </Link>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div
            aria-label={`${settings.name} avatar`}
            role="img"
            className="aspect-[4/5] rounded-lg border border-border bg-muted bg-cover bg-center"
            style={{ backgroundImage: `url("${settings.avatar}")` }}
          />
          <div className="flex flex-wrap gap-2">
            {settings.skills.map((skill) => (
              <Badge key={skill} variant="outline" className="rounded-full font-mono">
                {skill}
              </Badge>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}
