export const fallbackProjects = [
  {
    title: "Obsidian Digital Garden",
    slug: "obsidian-digital-garden",
    year: "2026",
    summary: "以 Obsidian 为唯一内容源的知识库、博客和 RAG 助手。",
    stack: ["Next.js", "Obsidian", "RAG", "Qdrant"],
    cover: "/project-neural.jpg",
    github: "https://github.com/",
    demo: "/"
  },
  {
    title: "Diffusion Research Notes",
    slug: "diffusion-research-notes",
    year: "2025",
    summary: "围绕扩散模型、图像修复和论文阅读构建的研究笔记系统。",
    stack: ["PyTorch", "Diffusion", "Markdown"],
    cover: "/project-memory.jpg",
    github: "https://github.com/",
    demo: "/knowledge"
  },
  {
    title: "Java Backend Learning Map",
    slug: "java-backend-learning-map",
    year: "2025",
    summary: "后端工程、Redis、MySQL、Spring 体系的长期学习路线。",
    stack: ["Java", "Spring", "Redis", "MySQL"],
    cover: "/project-dashboard.jpg",
    github: "https://github.com/",
    demo: "/blog"
  }
];

export const adminStats = [
  { label: "文章数量", value: "125", hint: "来自当前 Obsidian Vault" },
  { label: "标签数量", value: "自动", hint: "同步时由 Frontmatter 与正文提取" },
  { label: "图片数量", value: "247", hint: "png/jpg/tif 等资源" },
  { label: "Embedding 状态", value: "待构建", hint: "连接 Qdrant 后可重建" }
];

export const ragSources = [
  "论文/扩散模型/DDPM--起源之作阅读.md",
  "基础学习/机器学习/基础概念.md",
  "其他学习/JAVA/项目笔记/Redis-黑马点评项目笔记.md"
];
