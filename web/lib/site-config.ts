import {
  Bot,
  BriefcaseBusiness,
  FileText,
  Github,
  Home,
  LibraryBig,
  Mail,
  Settings,
  UserRound
} from "lucide-react";

export const siteConfig = {
  name: "Rainbell",
  title: "Rainbell Digital Garden",
  slogan: "在持续学习中，把零散想法长成可复用的知识系统。",
  description:
    "一个由 Obsidian 驱动的个人数字花园，沉淀研究、工程、项目和长期思考。",
  avatar: "/avatar.svg",
  email: "hello@example.com",
  github: "https://github.com/",
  nav: [
    { href: "/", label: "Home", icon: Home },
    { href: "/knowledge", label: "Knowledge", icon: LibraryBig },
    { href: "/blog", label: "Blog", icon: FileText },
    { href: "/projects", label: "Projects", icon: BriefcaseBusiness },
    { href: "/ai", label: "AI", icon: Bot },
    { href: "/about", label: "About", icon: UserRound },
    { href: "/admin", label: "Admin", icon: Settings }
  ],
  socials: [
    { href: "https://github.com/", label: "GitHub", icon: Github },
    { href: "mailto:hello@example.com", label: "Email", icon: Mail }
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
