import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Github } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fallbackProjects } from "@/lib/sample-data";

type ProjectPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return fallbackProjects.map((project) => ({ slug: project.slug }));
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const project = fallbackProjects.find((item) => item.slug === slug);
  if (!project) notFound();

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <Button asChild variant="ghost" size="sm" className="mb-6">
        <Link href="/projects">
          <ArrowLeft className="size-4" />
          Projects
        </Link>
      </Button>
      <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
        <article>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-muted-foreground">{project.year}</p>
          <h1 className="mt-4 text-5xl font-semibold tracking-tight text-balance">{project.title}</h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground">{project.summary}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {project.stack.map((tag) => (
              <Badge key={tag} variant="outline" className="rounded-full font-mono">
                {tag}
              </Badge>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild>
              <Link href={project.github}>
                <Github className="size-4" />
                GitHub
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={project.demo}>
                <ExternalLink className="size-4" />
                在线演示
              </Link>
            </Button>
          </div>
        </article>
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <Image
            src={project.cover}
            alt={project.title}
            width={720}
            height={480}
            className="aspect-[4/3] w-full object-cover grayscale-[30%] contrast-110"
          />
        </div>
      </div>
    </main>
  );
}
