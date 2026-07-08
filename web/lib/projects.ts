import "server-only";

import { unstable_cache } from "next/cache";
import { getRuntimeCached } from "@/lib/cache/runtime-cache";
import { databaseConfigured, prisma } from "@/lib/db/prisma";
import { fallbackProjects } from "@/lib/sample-data";

export type ProjectRecord = {
  id?: string;
  title: string;
  slug: string;
  year?: string | null;
  summary: string;
  description?: string | null;
  stack: string[];
  cover?: string | null;
  github?: string | null;
  demo?: string | null;
  docsUrl?: string | null;
  featured: boolean;
  visible: boolean;
  sortOrder: number;
};

function fallbackProjectRecords(): ProjectRecord[] {
  return fallbackProjects.map((project, index) => ({
    ...project,
    description: project.summary,
    docsUrl: null,
    featured: index === 0,
    visible: true,
    sortOrder: index
  }));
}

const projectOrderBy = [{ sortOrder: "asc" as const }, { createdAt: "desc" as const }];

function shouldUseDatabase() {
  return databaseConfigured();
}

function reportProjectFallback(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (process.env.NODE_ENV === "development") {
    console.warn(`Project query unavailable, using fallback projects: ${message}`);
    return;
  }
  console.error(`Project query unavailable, using fallback projects: ${message}`);
}

async function queryVisibleProjects() {
  if (!shouldUseDatabase()) return fallbackProjectRecords();
  try {
    const projects = await prisma.project.findMany({
      where: { visible: true },
      orderBy: projectOrderBy
    });
    return projects.length > 0 ? projects : fallbackProjectRecords();
  } catch (error) {
    reportProjectFallback(error);
    return fallbackProjectRecords();
  }
}

const cachedVisibleProjects = unstable_cache(queryVisibleProjects, ["projects:visible"], {
  revalidate: 600,
  tags: ["projects"]
});

export async function getVisibleProjects() {
  return getRuntimeCached("projects:visible", 10 * 60 * 1000, cachedVisibleProjects);
}

export async function getFeaturedProjects() {
  const projects = await getVisibleProjects();
  const featured = projects.filter((project) => project.featured);
  return featured.length > 0 ? featured : projects.slice(0, 3);
}

export async function getProjectBySlug(slug: string) {
  const projects = await getVisibleProjects();
  return projects.find((project) => project.slug === slug) ?? null;
}

export async function getAdminProjects() {
  if (!shouldUseDatabase()) return fallbackProjectRecords();
  return prisma.project.findMany({
    orderBy: projectOrderBy
  });
}
