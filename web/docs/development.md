# PKB Web 开发文档

本文档面向项目维护者，说明项目架构、开发流程、使用工具、部署关系、注意事项，以及为什么这个项目适合作为长期维护的个人网站和简历项目。

## 1. 项目定位

PKB Web 是一个现代化个人数字花园，核心是“内容优先”和“Obsidian 单一内容源”。

它不是传统 CMS 博客，也不是一个把编辑器塞进后台的内容平台。项目设计重点是：

- 本地写作体验优先
- 网站只是展示和服务层
- AI 只做知识库 RAG 问答
- 维护成本尽量低
- 长期可扩展

## 2. 当前技术栈

### 前端

- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui 风格组件
- Framer Motion

### 数据与内容

- Obsidian Markdown
- Gitee 私有仓库
- Prisma ORM
- Supabase Postgres
- Vercel Blob

### AI / RAG

- Vercel AI SDK
- OpenAI 兼容聊天接口
- 阿里云百炼 Embedding 兼容 OpenAI 接口
- Qdrant Cloud

### 认证与部署

- Auth.js
- GitHub OAuth
- Vercel

## 3. 项目目录结构

正式站点位于 `web/`，推荐只把它当作生产工程目录。

```text
PKB/
├─ framer-motion/        # v0 视觉参考源码，不作为正式站点
├─ obsidian/             # 本地 Vault 预览目录
└─ web/                  # 正式 Next.js 工程
   ├─ app/               # App Router 页面与 API
   ├─ components/        # 页面组件与通用 UI
   ├─ lib/               # 业务逻辑、同步、缓存、RAG、权限
   ├─ prisma/            # Prisma schema 与 migrations
   ├─ public/            # 静态资源
   ├─ scripts/           # 本地运维脚本
   ├─ docs/              # 项目文档
   └─ middleware.ts      # 权限与路由保护
```

## 4. 核心架构说明

### 4.1 内容流

内容流是整个项目最重要的一条主线：

1. 用户在 Obsidian 中写 Markdown
2. 内容推送到 Gitee 私有仓库
3. 后台触发同步任务
4. 服务端读取仓库内容
5. 解析 Markdown、Frontmatter、Tag、WikiLink、Backlink
6. 写入 Supabase
7. 只对 `visibility = public` 的新增或修改文档执行增量 Embedding
8. 向量写入 Qdrant
9. 前台 Knowledge、Blog、AI 从数据库和向量库读取结果

### 4.2 同步策略

当前同步支持两种模式：

- `manual`
- `auto`

低成本生产环境推荐以 `manual` 为主，因为：

- 排障更简单
- 不依赖高频 Cron
- 对 Hobby 计划更友好

### 4.3 RAG 策略

当前 RAG 采用“结构化内容 + 向量检索”的方式：

1. 文档按 chunk 拆分
2. 只对 `public` 的新增/修改文档做增量向量化
3. 检索时从 Qdrant 获取相关片段
4. 组装引用来源
5. 调用聊天模型生成最终回答

这样能降低成本，也能减少每次同步的等待时间。

### 4.4 内容可见性

`visibility` 和 `published` 的职责必须分开：

- `visibility` 控制 Knowledge 和 AI 是否可见
- `published` 控制 Blog、RSS 和正式文章列表

默认迁移策略是把已有笔记设为 `public`，避免上线后内容突然消失。后续可在后台逐步改为 `private`。

## 5. 开发流程建议

建议按下面的顺序工作。

### 5.1 本地启动

```bash
cd web
npm install
npm run dev
```

### 5.2 环境变量准备

至少需要：

- `DATABASE_URL`
- `DIRECT_URL`
- `AUTH_SECRET`
- `AUTH_GITHUB_ID`
- `AUTH_GITHUB_SECRET`
- `ADMIN_EMAILS`
- `NEXT_PUBLIC_SITE_URL`
- `GITEE_DEFAULT_REPO_URL`
- `GITEE_DEFAULT_BRANCH`

如果要跑 AI：

- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`
- `OPENAI_CHAT_MODEL`
- `EMBEDDING_API_KEY`
- `EMBEDDING_BASE_URL`
- `EMBEDDING_MODEL`
- `EMBEDDING_DIMENSIONS`
- `QDRANT_URL`
- `QDRANT_API_KEY`
- `QDRANT_COLLECTION`
- `BLOB_STORE_ID`
- `BLOB_READ_WRITE_TOKEN`

### 5.3 本地内容模式

本地开发支持两种内容来源。

#### 方式一：本地 Vault 预览

```env
CONTENT_SOURCE="vault"
OBSIDIAN_VAULT_PATH="../obsidian"
```

适合快速调 UI 和 Markdown 渲染。

#### 方式二：数据库模式

```env
CONTENT_SOURCE="database"
```

适合验证线上一致的内容行为、缓存和同步结果。

### 5.4 代码质量检查

每次重要修改后建议执行：

```bash
npm run typecheck
npm run lint
npm run build
```

## 6. 关键模块说明

### 内容解析

重点在：

- Frontmatter 解析
- Markdown 渲染
- WikiLink / Backlink 处理
- 标题提取
- 数学公式与 Mermaid 支持

开发时要特别注意：

- 不要把正文第一段误判成标题
- 不要让代码块中的 `#` 污染目录和标题
- 数学块和代码块预处理要互相隔离

### 同步系统

同步逻辑主要负责：

- 扫描远程仓库
- 识别新增/修改/删除
- 写入 notes、assets、links、tags
- 记录 sync job 和 sync logs
- 触发缓存失效

这里的重点不是“快写完”，而是“能重跑、可定位、能回溯”。

### AI 与 Embedding

当前已升级为增量向量化：

- 同步时只处理新增或修改的文档
- private / unlisted 文档会清理旧向量
- 删除文档时同步清理对应向量
- 保留手动全量重建作为兜底

维护时要注意：

- Embedding 维度必须和 Qdrant collection 一致
- 更换模型或 chunk 参数后应全量重建
- 中转聊天接口和 Embedding 接口可以分离

### 权限系统

后台权限基于：

- Auth.js session
- GitHub OAuth
- `ADMIN_EMAILS` 白名单

所以判断权限时，不应只看“是否登录”，必须看“是否为管理员邮箱”。

### Projects

项目展示独立于 Obsidian 内容，由后台 `Project` 模型维护。它适合放简历项目、研究项目和作品集内容，不建议混入 Knowledge 笔记发布流程。

### Blob 上传

上传使用 Vercel Blob。线上优先依赖项目与 Blob Store 的 OIDC 连接；本地调试时通过 `BLOB_READ_WRITE_TOKEN` 提供写权限。上传 API 只允许管理员访问，并按用途限制文件类型和大小。

## 7. 推荐使用的工具

### 开发工具

- VS Code
- Supabase CLI
- Prisma CLI
- Git
- Chrome DevTools

### 线上平台

- Vercel
- Supabase
- Qdrant Cloud
- Gitee

### 常用命令

```bash
npm run dev
npm run typecheck
npm run lint
npm run build
npm run sync:scan
npm run sync:run
npm run sync:now
npx prisma generate
npx prisma migrate deploy
```

## 8. 开发中的注意要点

### 8.1 不要破坏“Obsidian 单一内容源”

这是整个项目的根设计约束。

不建议新增：

- 富文本后台编辑器
- 独立文章管理系统
- 内容双写逻辑

### 8.2 优先做低维护方案

这个项目适合长期个人维护，所以优先级应该是：

1. 稳定
2. 易排障
3. 成本可控
4. 体验够好

不是一味追求复杂视觉或重基础设施。

### 8.3 动效要克制

当前设计参考了 v0 的暗色高级感，但正式站点要服务阅读和知识管理。

因此建议：

- 首页保留轻量进入动效
- 后台尽量少动效
- 内容页优先阅读稳定性
- 加载状态清晰可见

### 8.4 数据与缓存要分层思考

当前项目同时存在：

- Next Data Cache
- 运行时缓存
- 数据库持久化
- Qdrant 向量索引

所以任何“内容为什么没更新”的问题，都要按层排查：

1. 是否同步到了仓库
2. 是否写入数据库
3. 是否触发缓存失效
4. 是否完成向量更新
5. 是否命中正确检索结果

### 8.5 不要把敏感信息放进仓库

必须保护：

- 数据库连接串
- GitHub OAuth Secret
- Gitee Token
- Qdrant API Key
- Embedding API Key

建议只保留 `.env.example`，不要提交真实配置。

## 9. 低成本部署建议

当前比较适合个人站的组合是：

- 前端与 API：Vercel Hobby
- 数据库：Supabase 免费或低配
- 向量库：Qdrant Cloud 免费起步
- 仓库：Gitee 私有仓库

这套方案的优点：

- 前期成本低
- 部署链路清楚
- 出问题容易定位
- 后续升级空间足够

## 10. 建议的迭代顺序

如果后面继续开发，推荐顺序如下：

1. 完善 AI 引用展示和回答质量
2. 强化搜索体验
3. 优化图片资源策略
4. 增加更完整的项目页结构
5. 增加 RSS、SEO、OG 能力
6. 做更细致的后台审计与监控

## 11. 项目优势总结

这个项目的价值不只是“做了一个博客”，而是做了一套长期可维护的个人知识系统。

主要优点：

- Obsidian 单一内容源，写作体验稳定
- 内容同步、发布、AI 检索职责分离清晰
- 适合长期沉淀个人知识资产
- 有完整前台、后台、数据库、向量库和部署链路
- 兼顾个人展示、知识管理和 AI 应用场景

## 12. 作为简历项目怎么描述

可以这样概括：

### 项目名称

PKB Web / Personal Knowledge Base Digital Garden

### 项目简介

基于 Next.js、Supabase、Qdrant 和 Obsidian 构建的个人数字花园与知识库网站，支持私有仓库同步、公开博客发布、后台配置管理和基于知识库的 RAG 问答。

### 技术亮点

- 设计并实现 Obsidian 私有仓库同步链路
- 使用 Prisma + Supabase 构建内容存储与管理后台
- 接入 Qdrant 与 Embedding 模型，完成增量向量化与 RAG 检索
- 拆分 Knowledge 可见性与 Blog 发布状态，避免私有内容误公开
- 接入 Vercel Blob 上传头像、简历和项目封面
- 基于 Next.js App Router 构建内容优先的高性能前端
- 使用 Auth.js + GitHub OAuth 实现后台权限控制

### 简历关键词

- Next.js
- React
- TypeScript
- Prisma
- PostgreSQL
- Supabase
- Qdrant
- RAG
- Embedding
- Markdown / Obsidian
- 后台管理系统
- Vercel 部署

## 13. 维护建议

后续长期维护时，建议坚持以下原则：

- 内容仍然只在 Obsidian 中写
- 后台只做配置与运营，不做正文编辑
- 配置改动优先走数据库，不依赖本地文件
- 每次上线前执行类型检查、Lint 和 Build
- 涉及 AI 和同步链路的修改必须做一次真实联调

这样这套站点才会一直保持“像产品”，而不是慢慢变成一堆临时脚本的集合。
