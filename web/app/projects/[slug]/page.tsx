import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Github } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getProjectBySlug, getVisibleProjects } from "@/lib/projects";

type ProjectPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const projects = await getVisibleProjects();
  return projects.map((project) => ({ slug: project.slug }));
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <Button asChild variant="ghost" size="sm" className="mb-6">
        <Link href="/projects">
          <ArrowLeft className="size-4" />
          返回项目列表
        </Link>
      </Button>
      <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
        <article>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-muted-foreground">{project.year}</p>
          <h1 className="mt-4 text-5xl font-semibold tracking-tight text-balance">{project.title}</h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground">{project.summary}</p>
          {project.description ? (
            <div className="mt-8 max-w-3xl whitespace-pre-line text-sm leading-7 text-foreground/85">
              {project.description}
            </div>
          ) : null}
          <div className="mt-6 flex flex-wrap gap-2">
            {project.stack.map((tag) => (
              <Badge key={tag} variant="outline" className="rounded-full font-mono">
                {tag}
              </Badge>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            {project.github ? (
              <Button asChild>
                <Link href={project.github}>
                  <Github className="size-4" />
                  GitHub
                </Link>
              </Button>
            ) : null}
            {project.demo ? (
              <Button asChild variant="outline">
                <Link href={project.demo}>
                  <ExternalLink className="size-4" />
                  在线演示
                </Link>
              </Button>
            ) : null}
            {project.docsUrl ? (
              <Button asChild variant="outline">
                <Link href={project.docsUrl}>
                  <ExternalLink className="size-4" />
                  文档
                </Link>
              </Button>
            ) : null}
          </div>
        </article>
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <Image
            src={project.cover ?? "/project-dashboard.jpg"}
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
