"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Copy, Download, Github, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ContactActionsProps = {
  email?: string;
  github?: string;
  resumeUrl?: string;
  compact?: boolean;
  className?: string;
};

export function ContactActions({ email, github, resumeUrl, compact = false, className }: ContactActionsProps) {
  const [copied, setCopied] = useState(false);

  async function copyEmail() {
    if (!email) return;

    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  const buttonClassName = compact ? "rounded-full px-0" : "rounded-full";

  return (
    <div className={cn("flex flex-wrap gap-3", className)}>
      {resumeUrl ? (
        <Button asChild size="sm" className={buttonClassName}>
          <a href={resumeUrl} target="_blank" rel="noreferrer">
            <Download className="size-4" />
            查看简历
          </a>
        </Button>
      ) : null}

      {github ? (
        <Button asChild size="sm" variant="outline" className={buttonClassName}>
          <Link href={github} target="_blank" rel="noreferrer">
            <Github className="size-4" />
            GitHub
            <ArrowUpRight className="size-3.5" />
          </Link>
        </Button>
      ) : null}

      {email ? (
        <Button type="button" size="sm" variant="outline" className={buttonClassName} onClick={copyEmail}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "邮箱已复制" : "复制邮箱"}
          <Mail className="size-3.5" />
        </Button>
      ) : null}
    </div>
  );
}
