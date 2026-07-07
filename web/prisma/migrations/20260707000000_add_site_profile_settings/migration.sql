CREATE TABLE IF NOT EXISTS "SiteSetting" (
  "id" TEXT NOT NULL DEFAULT 'singleton',
  "name" TEXT NOT NULL DEFAULT 'Rainbell',
  "title" TEXT NOT NULL DEFAULT 'Rainbell Digital Garden',
  "slogan" TEXT NOT NULL DEFAULT '在持续学习中，把零散想法长成可复用的知识系统。',
  "description" TEXT NOT NULL DEFAULT '一个由 Obsidian 驱动的个人数字花园，沉淀研究、工程、项目和长期思考。',
  "bio" TEXT NOT NULL DEFAULT '我关注深度学习、图像修复、后端工程与个人知识管理，习惯把研究笔记、工程实践和复盘沉淀在 Obsidian 中。',
  "education" TEXT NOT NULL DEFAULT '',
  "research" TEXT NOT NULL DEFAULT '扩散模型、图像修复、古文字图像处理、跨模态方法。',
  "skills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "resumeUrl" TEXT,
  "logo" TEXT,
  "avatar" TEXT,
  "github" TEXT,
  "email" TEXT,
  "themeColor" TEXT NOT NULL DEFAULT '#2563eb',
  "darkMode" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SiteSetting" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT 'Rainbell';
ALTER TABLE "SiteSetting" ADD COLUMN IF NOT EXISTS "slogan" TEXT NOT NULL DEFAULT '在持续学习中，把零散想法长成可复用的知识系统。';
ALTER TABLE "SiteSetting" ADD COLUMN IF NOT EXISTS "description" TEXT NOT NULL DEFAULT '一个由 Obsidian 驱动的个人数字花园，沉淀研究、工程、项目和长期思考。';
ALTER TABLE "SiteSetting" ADD COLUMN IF NOT EXISTS "bio" TEXT NOT NULL DEFAULT '我关注深度学习、图像修复、后端工程与个人知识管理，习惯把研究笔记、工程实践和复盘沉淀在 Obsidian 中。';
ALTER TABLE "SiteSetting" ADD COLUMN IF NOT EXISTS "education" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SiteSetting" ADD COLUMN IF NOT EXISTS "research" TEXT NOT NULL DEFAULT '扩散模型、图像修复、古文字图像处理、跨模态方法。';
ALTER TABLE "SiteSetting" ADD COLUMN IF NOT EXISTS "skills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "SiteSetting" ADD COLUMN IF NOT EXISTS "resumeUrl" TEXT;
