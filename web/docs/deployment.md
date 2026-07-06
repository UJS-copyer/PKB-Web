# 部署文档

## 1. 服务准备

- Vercel：导入网站仓库，Root Directory 设置为 `web`。
- Supabase：创建 PostgreSQL 数据库，开启 `pgvector`，复制 Supavisor session pooler 连接串。
- Supabase Storage：后续可创建 `obsidian-assets` bucket 缓存图片；当前版本可通过服务端 Gitee 代理读取图片。
- Gitee：确认私有 Obsidian 仓库 `https://gitee.com/fjw08/obsidian`，创建 Personal Access Token。
- 可选：Qdrant Cloud / Vercel Blob。第一版低成本部署不强依赖。

## 2. 环境变量

复制 `.env.example`，在 Vercel Project Settings 中填写：

- `DATABASE_URL`
- `DIRECT_URL`
- `AUTH_SECRET`
- `AUTH_GITHUB_ID`
- `AUTH_GITHUB_SECRET`
- `ADMIN_EMAILS`
- `APP_ENCRYPTION_KEY`
- `OPENAI_API_KEY`
- `SUPABASE_ASSETS_BUCKET`
- `GITEE_DEFAULT_REPO_URL`
- `GITEE_DEFAULT_BRANCH`
- `SYNC_CRON_SECRET`
- `NEXT_PUBLIC_SITE_URL`

可选：

- `QDRANT_URL`
- `QDRANT_API_KEY`
- `QDRANT_COLLECTION`
- `BLOB_READ_WRITE_TOKEN`

## 3. 数据库迁移

在本地或 CI 中运行：

```bash
npm run prisma:generate
npm run prisma:migrate
```

Supabase + Prisma 推荐运行时使用 Supavisor pooler，迁移使用 direct connection。
如果本地或 Vercel 访问 `:6543` transaction pooler 不稳定，可直接让 `DATABASE_URL` 和 `DIRECT_URL` 都使用 `:5432` session pooler。个人站点低流量场景下成本更低、排障更简单。

## 4. Vercel 部署

- Build Command：`npm run build`
- Install Command：`npm install`
- Output：Next.js 默认
- Cron：`vercel.json` 已配置 `/api/cron/sync` 每 10 分钟处理 pending jobs。

## 5. Gitee WebHook

后台进入 `/admin/settings`：

1. 仓库地址填 `https://gitee.com/fjw08/obsidian`。
2. 分支填 `master`，如实际是 `main` 请修改。
3. 填入 Gitee token。
4. 填入 WebHook Secret。
5. 同步模式选择 `自动同步`。

然后在 Gitee 仓库 WebHook 中配置：

- URL：`https://your-domain.com/api/webhooks/gitee`
- Secret/Token：与后台填写一致
- 事件：Push

## 6. 上线前检查

```bash
npm run typecheck
npm run lint
npm run build
npm run sync:now
npm audit --audit-level=moderate
```

以上全部通过后再发布生产。
