import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { FeaturedProjects } from "@/components/projects/featured-projects";

export const metadata: Metadata = {
  title: "Projects"
};

export default function ProjectsPage() {
  return (
    <main>
      <PageHeader
        eyebrow="Projects"
        title="项目展示"
        description="项目来自 Obsidian Frontmatter 或配置数据，页面风格参考 v0 的 Works，但保持克制。"
      />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <FeaturedProjects compact />
      </section>
    </main>
  );
}
