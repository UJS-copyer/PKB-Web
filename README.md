# PKB-Web

PKB Web 是一个基于 Obsidian 的个人数字花园与知识库网站，支持：

- 个人主页展示
- Knowledge 知识库阅读
- Blog 公开文章视图
- Projects 项目展示
- 后台同步与发布管理
- 基于知识库的 AI RAG 问答

正式应用位于 [web](./web)。

## 文档入口

- [使用文档](./web/docs/usage.md)
- [开发文档](./web/docs/development.md)
- [部署文档](./web/docs/deployment.md)

## 核心原则

- Obsidian 是唯一内容源
- 后台不提供富文本正文编辑
- 后台只负责配置、同步、发布和 AI 参数管理
- AI 模块只做知识库 RAG 问答

## 本地开发

```bash
cd web
npm install
npm run dev
```

## 质量检查

```bash
cd web
npm run typecheck
npm run lint
npm run build
```

## 部署要点

- Vercel Root Directory：`web`
- Build Command：`npm run prisma:generate && npm run build`
- Framework Preset：Next.js

## 注意事项

- 运行时密钥请通过环境变量配置
- 不要提交 `.env.local`、`prisma/.env`、`.data`、`.next` 或 `node_modules`
- 生产环境内容来源应为 Gitee 仓库同步后的数据库，而不是本地 Vault
