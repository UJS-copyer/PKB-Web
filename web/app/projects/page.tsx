import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { FeaturedProjects } from "@/components/projects/featured-projects";
import { getVisibleProjects } from "@/lib/projects";

export const metadata: Metadata = {
  title: "项目"
};

export default async function ProjectsPage() {
  const projects = await getVisibleProjects();

  return (
    <main>
      <PageHeader
        eyebrow="项目"
        title="项目展示"
        description="这里展示对外可见的项目条目，首页精选和项目页列表会保持同一份数据来源。"
      />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <FeaturedProjects compact projects={projects} />
      </section>
    </main>
  );
}
