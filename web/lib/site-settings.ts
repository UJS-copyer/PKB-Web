import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { invalidateAdminCache, invalidateContentCache } from "@/lib/cache/invalidation";
import { getRuntimeCached } from "@/lib/cache/runtime-cache";
import { databaseConfigured, prisma } from "@/lib/db/prisma";
import { siteConfig } from "@/lib/site-config";
import type { SiteSettings, SocialLink } from "@/lib/site-settings-types";

const siteSettingsId = "singleton";

export type SiteSettingsInput = {
  name?: string;
  title?: string;
  slogan?: string;
  description?: string;
  bio?: string;
  education?: string;
  research?: string;
  skills?: string[] | string;
  resumeUrl?: string | null;
  logo?: string | null;
  avatar?: string | null;
  github?: string | null;
  email?: string | null;
  themeColor?: string;
  darkMode?: boolean;
};

type SiteSettingsRow = {
  name?: string | null;
  title?: string | null;
  slogan?: string | null;
  description?: string | null;
  bio?: string | null;
  education?: string | null;
  research?: string | null;
  skills?: string[] | null;
  resumeUrl?: string | null;
  logo?: string | null;
  avatar?: string | null;
  github?: string | null;
  email?: string | null;
  themeColor?: string | null;
  darkMode?: boolean | null;
};

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(value: unknown) {
  const text = cleanText(value);
  return text.length > 0 ? text : undefined;
}

function normalizeMultilineText(value: unknown) {
  return cleanText(value)
    .replace(/\r\n?/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\/n/g, "\n");
}

function safeEmail(value: unknown) {
  const text = optionalText(value);
  if (!text) return undefined;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) ? text : undefined;
}

function safePublicUrl(value: unknown, { allowRelative = true } = {}) {
  const text = optionalText(value);
  if (!text) return undefined;

  if (allowRelative && text.startsWith("/") && !text.startsWith("//")) {
    return text;
  }

  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function safeThemeColor(value: unknown) {
  const text = optionalText(value);
  if (!text) return defaultSiteSettings.themeColor;
  return /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(text) ? text : defaultSiteSettings.themeColor;
}

function valueOrDefault(value: unknown, fallback: string) {
  return optionalText(value) ?? fallback;
}

function parseSkills(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(cleanText).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/[\n,，]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values));
}

function buildSocials(settings: Pick<SiteSettings, "email" | "github">): SocialLink[] {
  const links: SocialLink[] = [];
  if (settings.github) {
    links.push({ href: settings.github, label: "GitHub" });
  }
  return links;
}

export const defaultSiteSettings: Omit<SiteSettings, "socials"> = {
  name: siteConfig.name,
  title: siteConfig.title,
  slogan: siteConfig.slogan,
  description: siteConfig.description,
  bio: "我关注深度学习、图像修复、后端工程与个人知识管理，习惯把研究笔记、工程实践和复盘沉淀在 Obsidian 中。",
  education: "教育经历、阶段成果和长期学习方向可在后台 Settings 中维护。",
  research: "扩散模型、图像修复、古文字图像处理、跨模态方法。",
  skills: siteConfig.skills,
  resumeUrl: undefined,
  logo: undefined,
  avatar: siteConfig.avatar,
  github: siteConfig.github,
  email: siteConfig.email,
  themeColor: "#2563eb",
  darkMode: true
};

function normalizeSiteSettings(row?: SiteSettingsRow | null): SiteSettings {
  const hasRow = Boolean(row);
  const settings: Omit<SiteSettings, "socials"> = {
    name: valueOrDefault(row?.name, defaultSiteSettings.name),
    title: valueOrDefault(row?.title, defaultSiteSettings.title),
    slogan: valueOrDefault(row?.slogan, defaultSiteSettings.slogan),
    description: valueOrDefault(row?.description, defaultSiteSettings.description),
    bio: valueOrDefault(row?.bio, defaultSiteSettings.bio),
    education: hasRow ? normalizeMultilineText(row?.education) : defaultSiteSettings.education,
    research: hasRow ? normalizeMultilineText(row?.research) : defaultSiteSettings.research,
    skills: hasRow
      ? uniqueStrings(Array.isArray(row?.skills) ? row.skills.map(cleanText).filter(Boolean) : [])
      : defaultSiteSettings.skills,
    resumeUrl: hasRow ? safePublicUrl(row?.resumeUrl) : defaultSiteSettings.resumeUrl,
    logo: safePublicUrl(row?.logo) ?? defaultSiteSettings.logo,
    avatar: safePublicUrl(row?.avatar) ?? defaultSiteSettings.avatar,
    github: hasRow ? safePublicUrl(row?.github, { allowRelative: false }) : defaultSiteSettings.github,
    email: hasRow ? safeEmail(row?.email) : defaultSiteSettings.email,
    themeColor: safeThemeColor(row?.themeColor),
    darkMode: typeof row?.darkMode === "boolean" ? row.darkMode : defaultSiteSettings.darkMode
  };

  return {
    ...settings,
    socials: buildSocials(settings)
  };
}

function shouldUseDatabase() {
  return databaseConfigured();
}

function reportSiteSettingsFallback(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (process.env.NODE_ENV === "development") {
    console.warn(`Site settings unavailable, using defaults: ${message}`);
    return;
  }
  console.error(`Site settings unavailable, using defaults: ${message}`);
}

async function querySiteSettings(): Promise<SiteSettings> {
  if (!shouldUseDatabase()) {
    return normalizeSiteSettings(defaultSiteSettings);
  }

  try {
    const row = await prisma.siteSetting.findUnique({
      where: { id: siteSettingsId }
    });
    return normalizeSiteSettings(row);
  } catch (error) {
    reportSiteSettingsFallback(error);
    return normalizeSiteSettings(defaultSiteSettings);
  }
}

export async function getFreshSiteSettings(): Promise<SiteSettings> {
  return querySiteSettings();
}

const cachedSiteSettings = unstable_cache(querySiteSettings, ["site:settings"], {
  revalidate: 300,
  tags: ["site"]
});

export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  return getRuntimeCached("site:settings", 60 * 1000, cachedSiteSettings);
});

export async function saveSiteSettings(input: SiteSettingsInput) {
  if (!databaseConfigured()) {
    throw new Error("Database is required to save site settings.");
  }

  const skills = uniqueStrings(parseSkills(input.skills));
  const data = {
    name: valueOrDefault(input.name, defaultSiteSettings.name),
    title: valueOrDefault(input.title, defaultSiteSettings.title),
    slogan: valueOrDefault(input.slogan, defaultSiteSettings.slogan),
    description: valueOrDefault(input.description, defaultSiteSettings.description),
    bio: valueOrDefault(input.bio, defaultSiteSettings.bio),
    education: normalizeMultilineText(input.education),
    research: normalizeMultilineText(input.research),
    skills,
    resumeUrl: safePublicUrl(input.resumeUrl),
    logo: safePublicUrl(input.logo),
    avatar: safePublicUrl(input.avatar) ?? defaultSiteSettings.avatar,
    github: safePublicUrl(input.github, { allowRelative: false }),
    email: safeEmail(input.email),
    themeColor: safeThemeColor(input.themeColor),
    darkMode: input.darkMode ?? defaultSiteSettings.darkMode
  };

  const row = await prisma.siteSetting.upsert({
    where: { id: siteSettingsId },
    create: { id: siteSettingsId, ...data },
    update: data
  });

  invalidateAdminCache();
  invalidateContentCache();
  return normalizeSiteSettings(row);
}
