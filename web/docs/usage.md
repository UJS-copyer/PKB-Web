# 使用文档

## 本地开发

```bash
cd web
npm install
cp .env.example .env.local
npm run dev
```

配置了 `DATABASE_URL` 后，前台默认优先读取 Supabase 中已同步的内容，速度更稳定。

如果想绕过数据库、直接预览本机 Obsidian Vault，可使用：

```env
OBSIDIAN_VAULT_PATH="../obsidian"
CONTENT_SOURCE="vault"
```

这样无需连接 Gitee，也能直接读取本机 Vault；但首次进入 Knowledge 会扫描并解析本地 Markdown，可能比数据库模式慢。

如需显式验证 Supabase 中的同步内容，可设置：

```env
CONTENT_SOURCE="database"
```

构建阶段会自动走本地 fallback，避免 `npm run build` 依赖远程数据库。

## 配置 Obsidian 仓库

进入 `/admin/settings`，在 “Obsidian Repository” 中配置：

- 仓库地址：`https://gitee.com/fjw08/obsidian`
- 分支：`master`
- 同步模式：`手动同步` 或 `自动同步`
- Gitee Personal Access Token
- WebHook Secret

Token 只在服务端使用，保存后只显示掩码。

## 手动同步

1. 进入 `/admin/settings`。
2. 同步模式选择 `手动同步`。
3. 进入 `/admin/sync`。
4. 点击 `一键同步 Gitee`。
5. 在“同步任务”和“同步日志”中查看结果。

没有配置 Gitee token 时，同步任务会失败并显示明确错误。

开发机也可以直接运行：

```bash
npm run sync:now
```

该脚本会读取 Gitee 私有仓库并写入 Supabase，成功后输出 notes、assets、tags、links 数量。

## 自动同步

1. 进入 `/admin/settings`。
2. 同步模式选择 `自动同步`。
3. 复制页面中的 WebHook URL。
4. 在 Gitee 私有仓库中配置 WebHook。
5. Obsidian push 到 Gitee 后，网站会创建 webhook sync job。
6. Vercel Cron 会处理 pending jobs。

如果同步模式是 `手动同步`，Webhook 会被记录为 ignored，不会执行同步。

## 发布博客

推荐在 Obsidian 中直接写 Frontmatter：

```yaml
---
title: 示例文章
published: true
featured: false
category: 技术
tags:
  - Next.js
  - Obsidian
slug: example-post
cover: cover.png
---
```

也可以进入 `/admin/publish` 修改公开、推荐、slug、cover、category。后台会写回 Gitee Markdown Frontmatter。

## AI 问答

1. 在 `/admin/ai-config` 配置 Provider、模型、Embedding、TopK、Temperature。
2. 第一版会先使用数据库/本地 notes 做关键词 fallback 检索。
3. 后续接入 Supabase `pgvector` 后，在 `/admin/sync` 执行重新 Embedding。
4. 前台进入 `/ai` 提问。

AI 页面只做 RAG 问答，不做图片生成、Prompt 市场或社区功能。

## 安全约束

- 不在后台提供富文本编辑器。
- Obsidian 是唯一内容来源。
- 删除同步只标记数据库状态，不删除仓库文件。
- 不执行批量文件删除。
