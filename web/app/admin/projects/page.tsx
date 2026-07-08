import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { UploadField } from "@/components/admin/upload-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getAdminProjects } from "@/lib/projects";

export const metadata: Metadata = {
  title: "项目管理"
};

export default async function AdminProjectsPage() {
  const projects = await getAdminProjects();

  return (
    <main>
      <AdminPageHeader
        eyebrow="Admin / Projects"
        title="项目管理"
        description="维护首页精选项目和项目页内容，适合个人展示与简历项目沉淀。"
      />
      <section className="mx-auto grid max-w-[1400px] gap-6 px-4 py-10 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>新增项目</CardTitle>
          </CardHeader>
          <CardContent>
            <ProjectForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>项目列表</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            {projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">当前数据库还没有项目，前台会回退到示例项目。</p>
            ) : null}
            {projects.map((project) => (
              <div key={project.slug} className="rounded-lg border border-border p-4">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <h2 className="font-medium">{project.title}</h2>
                  {project.visible ? <Badge variant="accent">显示中</Badge> : <Badge variant="outline">已隐藏</Badge>}
                  {project.featured ? <Badge variant="outline">首页精选</Badge> : null}
                </div>
                <ProjectForm project={project} />
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function ProjectForm({
  project
}: {
  project?: {
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
}) {
  return (
    <form action="/api/admin/projects" method="post" className="grid gap-4">
      {project?.id ? <input type="hidden" name="id" value={project.id} /> : null}
      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-2 text-sm">
          <span className="text-muted-foreground">标题</span>
          <Input name="title" defaultValue={project?.title ?? ""} required />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="text-muted-foreground">Slug</span>
          <Input name="slug" defaultValue={project?.slug ?? ""} required />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="text-muted-foreground">年份</span>
          <Input name="year" defaultValue={project?.year ?? ""} />
        </label>
      </div>
      <label className="grid gap-2 text-sm">
        <span className="text-muted-foreground">简介</span>
        <Textarea name="summary" defaultValue={project?.summary ?? ""} required />
      </label>
      <label className="grid gap-2 text-sm">
        <span className="text-muted-foreground">详情</span>
        <Textarea name="description" defaultValue={project?.description ?? ""} className="min-h-28" />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm">
          <span className="text-muted-foreground">技术栈（每行或逗号分隔）</span>
          <Textarea name="stack" defaultValue={project?.stack.join("\n") ?? ""} />
        </label>
        <UploadField
          name="cover"
          label="项目封面"
          purpose="project-cover"
          accept="image/png,image/jpeg,image/webp"
          defaultValue={project?.cover ?? ""}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-2 text-sm">
          <span className="text-muted-foreground">GitHub</span>
          <Input name="github" defaultValue={project?.github ?? ""} />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="text-muted-foreground">在线演示</span>
          <Input name="demo" defaultValue={project?.demo ?? ""} />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="text-muted-foreground">文档链接</span>
          <Input name="docsUrl" defaultValue={project?.docsUrl ?? ""} />
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-5">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="visible" defaultChecked={project?.visible ?? true} />
            前台显示
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="featured" defaultChecked={project?.featured ?? false} />
            首页精选
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">排序</span>
            <Input name="sortOrder" type="number" defaultValue={project?.sortOrder ?? 0} className="h-8 w-24" />
          </label>
        </div>
        <Button type="submit" variant={project ? "outline" : "default"}>
          {project ? "保存项目" : "新增项目"}
        </Button>
      </div>
    </form>
  );
}
