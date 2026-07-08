import {
  Bot,
  BriefcaseBusiness,
  FileText,
  Github,
  Home,
  LibraryBig,
  Mail,
  Settings
} from "lucide-react";

export const siteConfig = {
  name: "Rainbell",
  title: "Rainbell Digital Garden",
  slogan: "在持续学习中，把零散想法长成可复用的知识系统。",
  description:
    "一个由 Obsidian 驱动的个人数字花园，沉淀研究、工程、项目和长期思考。",
  avatar: "/avatar.svg",
  email: "3129086013@qq.com",
  github: "https://github.com/UJS-copyer",
  nav: [
    { href: "/", label: "首页", icon: Home },
    { href: "/knowledge", label: "知识库", icon: LibraryBig },
    { href: "/blog", label: "博客", icon: FileText },
    { href: "/projects", label: "项目", icon: BriefcaseBusiness },
    { href: "/ai", label: "AI 助手", icon: Bot },
    { href: "/admin", label: "后台", icon: Settings }
  ],
  socials: [
    { href: "https://github.com/UJS-copyer", label: "GitHub", icon: Github },
    { href: "mailto:3129086013@qq.com", label: "邮箱", icon: Mail }
  ],
  skills: [
    "Next.js",
    "React",
    "TypeScript",
    "TailwindCSS",
    "Java",
    "Redis",
    "PyTorch",
    "Diffusion",
    "RAG",
    "Obsidian"
  ]
};
