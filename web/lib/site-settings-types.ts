export type SocialLink = {
  href: string;
  label: string;
};

export type SiteSettings = {
  name: string;
  title: string;
  slogan: string;
  description: string;
  bio: string;
  education: string;
  research: string;
  skills: string[];
  resumeUrl?: string;
  logo?: string;
  avatar: string;
  github?: string;
  email?: string;
  themeColor: string;
  darkMode: boolean;
  socials: SocialLink[];
};
