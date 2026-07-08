# PKB Web 使用文档

本文档面向网站所有者，重点说明后台怎么配置、内容怎么同步、博客怎么发布、AI 问答怎么使用。

## 1. 项目是什么

PKB Web 是一个由 Obsidian 驱动的个人数字花园。

核心原则：

- Obsidian 是唯一内容源
- 后台不提供富文本编辑
- 后台只负责配置、同步、发布、AI 参数管理
- 前台提供 Knowledge、Blog、Projects、AI Assistant 和个人主页展示

## 2. 你平时怎么用

日常使用一般只有这几件事：

1. 在 Obsidian 里写笔记
2. Push 到 Gitee 私有仓库
3. 进入后台执行同步，或等待自动同步
4. 需要公开的内容在后台标记为 `published`
5. 需要 AI 检索最新内容时执行增量 Embedding

也就是说，真正写内容还是在 Obsidian，网站只是展示层和管理层。

## 3. 前台模块说明

### Home

主页同时承担个人介绍页的作用，主要展示：

- 头像
- Slogan
- 个人简介
- 技能栈
- 最新笔记
- 精选项目
- 联系方式

### Knowledge

知识库是网站核心，内容来自同步后的 Obsidian 笔记，支持：

- Markdown 阅读
- WikiLink
- Backlink
- Tag
- 目录树浏览
- 数学公式
- Mermaid
- 代码高亮
- Callout
- 阅读目录
- 阅读进度

只有 `visibility: public` 的笔记会进入前台 Knowledge 和 AI 检索。`private` 不对访客展示，`unlisted` 预留为非列表公开能力。

### Blog

Blog 是 Knowledge 的公开视图，只展示 `published = true` 的内容。

更准确地说，Blog 只展示同时满足以下条件的笔记：

- `visibility: public`
- `published: true`

### Projects

Projects 用来展示项目简介、技术栈、GitHub 地址、在线演示和详情内容。

项目由后台 `/admin/projects` 维护，不依赖 Obsidian 正文。

### AI

AI 页面只做一件事：基于知识库进行 RAG 问答。

回答支持：

- 引用来源
- Markdown 渲染
- 代码高亮
- 数学公式
- 流式输出

## 4. 后台入口和登录

后台地址通常为：

- 本地：`/admin`
- 线上：`https://你的域名/admin`

登录方式：

- 使用 GitHub 登录
- 登录邮箱必须在 `ADMIN_EMAILS` 白名单中

如果登录成功但无法进入后台，优先检查：

- GitHub OAuth 是否配置正确
- 当前 GitHub 邮箱是否在管理员白名单中
- `AUTH_SECRET` 和 `NEXT_PUBLIC_SITE_URL` 是否正确

## 5. 后台菜单怎么用

### Dashboard

这里主要看运行状态：

- 笔记数量
- 标签数量
- 图片数量
- Embedding 状态
- 最近同步时间
- 同步任务状态

适合先确认系统是否正常。

### Settings

这里分成两类配置。

#### Site Profile

可配置：

- 作者名称
- 网站标题
- Slogan
- 简介
- 个人 Bio
- 教育经历
- 研究方向
- 技能列表
- 头像 URL
- GitHub 地址
- 邮箱
- 简历链接

保存后会影响首页、页脚和部分个人介绍区域。

#### Obsidian Repository

可配置：

- 仓库地址
- 分支名
- Gitee Token
- Webhook Secret
- 同步模式

当前支持两种同步模式：

- `manual`：只允许手动同步
- `auto`：允许 Gitee Push Webhook 自动创建同步任务

### Sync

这是最常用的后台页面。

可执行操作：

- 一键同步
- 重建搜索索引
- 重新 Embedding
- 查看同步任务
- 查看同步日志

建议使用方式：

- 内容刚改完，先点“一键同步”
- 如果只是新增或修改了部分笔记，当前版本会做增量 Embedding，不再每次全量重建
- 如果你怀疑向量数据异常，再手动执行一次“重新 Embedding”

### Publish

这里是公开内容管理区。

你可以设置：

- Visibility
- 是否公开
- 是否推荐
- Slug
- Cover
- Category

其中 `visibility` 控制是否进入 Knowledge 和 AI，`published` 控制是否进入 Blog。保存后会把 Frontmatter 写回仓库，再触发一次小范围同步。

### Projects

这里维护个人项目展示：

- 项目标题
- Slug
- 年份
- 简介和详情
- 技术栈
- 封面图
- GitHub / Demo / 文档链接
- 是否首页精选
- 是否前台显示
- 排序

如果已经接入 Vercel Blob，可以直接上传项目封面。

### AI Config

这里用于配置问答能力。

常用项：

- Chat Provider
- Chat Model
- Embedding Model
- Embedding Dimensions
- Chunk Size
- Overlap
- TopK
- Temperature
- System Prompt

建议：

- 聊天模型与 Embedding 模型分开配置
- Embedding 维度必须和 Qdrant collection 维度一致
- 不熟悉参数时，先保持默认值

## 6. 内容同步操作手册

### 手动同步

适合日常最稳定的流程。

1. 在 Obsidian 中完成编辑
2. Push 到 Gitee 私有仓库
3. 进入 `/admin/sync`
4. 点击“一键同步”
5. 等待任务完成
6. 在同步日志中确认：
   - repository 读取成功
   - scan 完成
   - fetch 完成
   - database 完成
   - embedding 完成
   - finish 完成

### 自动同步

适合你已经把整套部署跑顺之后再开启。

1. 在 `/admin/settings` 中把同步模式改成 `auto`
2. 复制 Webhook 地址：`https://你的域名/api/webhooks/gitee`
3. 到 Gitee 仓库配置 Push Webhook
4. 填入和后台一致的 Webhook Secret
5. Push 新内容后，系统会自动创建同步任务

说明：

- Vercel Hobby 计划的 Cron 能力有限
- 所以低成本方案下，建议把自动同步作为辅助能力，手动同步作为主流程

## 7. 博客发布操作手册

推荐做法有两种。

### 方式一：在 Obsidian 中直接写 Frontmatter

```yaml
---
title: 我的文章标题
published: true
featured: false
category: AI
tags:
  - RAG
  - Obsidian
slug: my-post
cover: https://example.com/cover.png
---
```

写完后同步即可。

### 方式二：在后台 Publish 页面管理

适合你已经写完内容，只想控制公开状态和展示信息。

## 8. AI 问答操作手册

### 第一次启用

1. 在 `/admin/ai-config` 中配置聊天模型
2. 配置 Embedding 模型
3. 确认 Qdrant 连接正常
4. 执行一次同步
5. 执行一次“重新 Embedding”或等待同步时自动增量向量化

### 日常使用

1. 新增或修改 Obsidian 笔记
2. Push 到 Gitee
3. 后台执行同步
4. 系统只会对新增或修改的文档做增量向量化
5. 前台 `/ai` 直接提问

AI 页面支持当前会话上下文。点击“新对话”后，旧上下文不会继续参与回答。对话历史默认不落库保存。

## 9. Blob 上传

后台支持上传：

- 头像
- 简历 PDF
- 项目封面

需要先在环境变量中配置：

- `BLOB_STORE_ID`
- `BLOB_READ_WRITE_TOKEN`

线上部署在 Vercel 时，如果项目已经连接 Blob Store，通常不需要手动填写 `BLOB_READ_WRITE_TOKEN`。本地开发要测试上传时，建议配置一个临时 read-write token。

## 10. 什么时候需要全量重建

通常只有这几种情况需要：

- 更换了 Embedding 模型
- 更换了 Embedding 维度
- 调整了 Chunk Size / Overlap
- 怀疑历史向量数据不一致

## 11. 常见问题

### 1. 为什么写了笔记但网站没更新

先检查：

- 是否已经 Push 到 Gitee
- 当前后台是手动还是自动同步
- 同步任务是否成功
- 该笔记是否被标记为删除或未公开

### 2. 为什么 Blog 没显示文章

检查该笔记是否：

- `visibility: public`
- `published: true`
- 同步成功
- 不是 `deleted` 状态

### 3. 为什么 AI 回答不到最新内容

通常是以下原因：

- 内容还没同步到数据库
- 对应文档还没完成增量向量化
- Qdrant 配置异常
- 当前提问和知识库内容相关度过低

### 4. 为什么后台保存设置失败

优先检查：

- 数据库连接是否正常
- GitHub 登录是否仍有效
- 是否为管理员邮箱
- Gitee Token 或 Webhook Secret 是否为空或格式异常

## 12. 安全和使用约束

请始终遵守：

- 不在后台直接编辑正文
- 不把 API Key、数据库密码写入仓库
- 不把 `.env.local`、`prisma/.env`、`.data` 提交到 Git
- 删除同步只做数据库层面的删除标记，不批量删除源文件

## 13. 推荐日常工作流

适合个人长期维护的低成本流程如下：

1. 用 Obsidian 写作
2. Push 到 Gitee 私有仓库
3. 后台手动同步
4. 确认公开状态
5. 在前台检查展示效果
6. 需要时测试 AI 问答

这是当前最稳、最省钱、最容易排障的方案。
