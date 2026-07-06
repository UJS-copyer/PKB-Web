import Link from "next/link";
import type { Metadata } from "next";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "About"
};

export default function AboutPage() {
  return (
    <main>
      <PageHeader
        eyebrow="About"
        title="个人简介"
        description="研究、工程和长期知识沉淀共同构成这个数字花园。"
      />
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_320px] lg:px-8">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>简介</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
              <p>
                我关注深度学习、图像修复、后端工程与个人知识管理，习惯把研究笔记、工程实践和复盘沉淀在 Obsidian 中。
              </p>
              <p>
                这个网站不是传统博客，而是一个长期维护的知识系统：内容写在本地，网站负责同步、发布、检索和问答。
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>教育经历与研究方向</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm leading-7 text-muted-foreground">
              <p>研究方向：扩散模型、图像修复、古文字图像处理、跨模态方法。</p>
              <p>工程方向：Next.js、Java 后端、Redis、MySQL、RAG 应用架构。</p>
            </CardContent>
          </Card>
        </div>
        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>技能栈</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {siteConfig.skills.map((skill) => (
                <Badge key={skill} variant="outline" className="rounded-full">
                  {skill}
                </Badge>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>联系</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full">
                <Link href="/resume.pdf">
                  <Download className="size-4" />
                  简历下载
                </Link>
              </Button>
              {siteConfig.socials.map((social) => (
                <Button key={social.label} asChild variant="outline" className="w-full">
                  <Link href={social.href}>{social.label}</Link>
                </Button>
              ))}
            </CardContent>
          </Card>
        </aside>
      </section>
    </main>
  );
}
