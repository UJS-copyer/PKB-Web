import type { RepositoryConfig } from "./types";

export const defaultRepositoryConfig: RepositoryConfig = {
  provider: "gitee",
  repoUrl: process.env.GITEE_DEFAULT_REPO_URL ?? "https://gitee.com/fjw08/obsidian",
  owner: "fjw08",
  repo: "obsidian",
  branch: process.env.GITEE_DEFAULT_BRANCH ?? "master",
  syncMode: "manual"
};

export function maskSecret(value?: string) {
  if (!value) return "";
  if (value.length <= 8) return "********";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}
