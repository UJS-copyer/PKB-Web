# 部署文档

本文档只讲部署，不重复后台日常操作。后台使用说明请看 [usage.md](./usage.md)，开发维护说明请看 [development.md](./development.md)。

## 1. 推荐部署组合

低成本方案建议：

- 前端与 API：Vercel Hobby
- 数据库：Supabase
- 向量库：Qdrant Cloud
- 内容仓库：Gitee 私有仓库

这套组合已经覆盖当前项目的完整能力，而且维护成本较低。

## 2. 服务准备

### Vercel

- 导入 GitHub 仓库
- Root Directory 设置为 `web`
- Framework Preset 选择 Next.js

### Supabase

- 创建 PostgreSQL 数据库
- 开启 `pgvector`
- 准备 Prisma 使用的连接串

### Qdrant Cloud

- 创建一个 collection
- 向量维度要与 `EMBEDDING_DIMENSIONS` 一致
- 当前推荐使用 `1024`

### Vercel Blob

- 在 Vercel Storage 中创建一个 Public Blob Store
- 将 Blob Store 连接到当前项目
- 线上部署时优先使用项目连接后的 OIDC 能力

### Gitee

- 准备私有 Obsidian 仓库
- 创建 Personal Access Token
- 需要自动同步时再配置 Webhook

## 3. 环境变量

以 `web/.env.example` 为准，生产环境至少需要以下变量。

### 基础

- `DATABASE_URL`
- `DIRECT_URL`
- `AUTH_SECRET`
- `AUTH_GITHUB_ID`
- `AUTH_GITHUB_SECRET`
- `ADMIN_EMAILS`
- `APP_ENCRYPTION_KEY`
- `NEXT_PUBLIC_SITE_URL`

### 仓库同步

- `GITEE_DEFAULT_REPO_URL`
- `GITEE_DEFAULT_BRANCH`
- `CRON_SECRET`
- `SYNC_CRON_SECRET`

### AI 聊天

- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`
- `OPENAI_CHAT_MODEL`

### Embedding

- `EMBEDDING_API_KEY`
- `EMBEDDING_BASE_URL`
- `EMBEDDING_MODEL`
- `EMBEDDING_DIMENSIONS`

### 向量库

- `QDRANT_URL`
- `QDRANT_API_KEY`
- `QDRANT_COLLECTION`

### 文件上传

- `BLOB_STORE_ID`
- `BLOB_READ_WRITE_TOKEN`
- `SUPABASE_ASSETS_BUCKET`

说明：

- 线上部署在 Vercel 时，如果项目已连接 Blob Store，通常依赖 `BLOB_STORE_ID + OIDC`
- 本地开发要测试上传，建议额外配置 `BLOB_READ_WRITE_TOKEN`

## 4. 数据库与 Prisma

部署前建议先在本地执行：

```bash
npx prisma generate
npx prisma migrate deploy
```

说明：

- `DATABASE_URL` 用于运行时
- `DIRECT_URL` 用于 Prisma 直接连接
- 低流量个人站可以直接使用 Supabase `:5432` session pooler，稳定性更好

## 5. Vercel 构建配置

建议配置：

- Root Directory：`web`
- Install Command：`npm install`
- Build Command：`npm run prisma:generate && npm run build`

如果 Vercel 上 Prisma Client 没更新，优先检查是否遗漏了 `prisma:generate`。

## 6. GitHub OAuth 配置

后台登录依赖 GitHub OAuth。

GitHub OAuth App 建议配置：

- Homepage URL：你的正式站点域名
- Authorization callback URL：`https://你的域名/api/auth/callback/github`

注意：

- 本地开发和线上部署建议共用同一个 App 时，确保回调地址和当前环境一致
- 如果线上域名变化，需要更新 OAuth App 配置

## 7. 后台首次初始化

部署成功后，首次进入后台建议按这个顺序：

1. 登录 `/admin`
2. 在 `/admin/settings` 填写站点信息
3. 填写 Gitee 仓库配置
4. 保存 Gitee Token 和 Webhook Secret
5. 进入 `/admin/sync` 执行一次手动同步
6. 检查 Knowledge 是否正常展示
7. 在 `/admin/projects` 配置项目展示
8. 测试头像、简历、项目封面上传
9. 进入 `/admin/ai-config` 配置聊天模型和 Embedding 模型
10. 执行一次 Embedding 构建
11. 到前台 `/ai` 测试问答

## 8. Gitee Webhook 配置

只有在启用自动同步时才需要配置。

后台填好：

- Repo URL
- Branch
- Token
- Webhook Secret
- Sync Mode = `auto`

然后到 Gitee 配置：

- URL：`https://你的域名/api/webhooks/gitee`
- Secret：与后台一致
- 事件：Push

如果站点仍以低成本手动同步为主，这一步可以后置。

## 9. Qdrant Collection 参数建议

推荐：

- Collection Name：`pkb_knowledge_v1`
- Vector Size：与 `EMBEDDING_DIMENSIONS` 保持一致
- Distance：`Cosine`

如果你使用阿里云百炼 `text-embedding-v4` 且维度为 `1024`，Qdrant 也必须用 `1024`。

## 10. 生产环境注意事项

- 不要把真实密钥写进仓库
- 不要依赖本地 `../obsidian` 作为生产内容源
- 后台权限必须依赖 GitHub 登录和管理员白名单
- 更换 Embedding 模型或维度后，要执行全量重建
- 日常更新内容时，当前版本已经支持增量向量化

## 11. 上线前检查

```bash
npm run typecheck
npm run lint
npm run build
npm run sync:now
```

建议再做一次人工检查：

- 首页是否正常
- `/knowledge` 是否能打开文章
- `/admin` 是否能登录
- `/admin/sync` 是否能同步
- `/ai` 是否能返回带引用的回答
