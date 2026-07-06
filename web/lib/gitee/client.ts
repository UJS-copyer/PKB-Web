import "server-only";

import { decryptSecret } from "@/lib/security/crypto";
import type { RepositoryConfig } from "@/lib/admin/types";

const apiBase = "https://gitee.com/api/v5";

export type GiteeTreeItem = {
  path: string;
  type: "blob" | "tree";
  sha?: string;
  size?: number;
};

export type GiteeContentFile = {
  path: string;
  name: string;
  sha: string;
  content: string;
  encoding: string;
};

function requireToken(config: RepositoryConfig) {
  const token = decryptSecret(config.tokenEncrypted);
  if (!token) {
    throw new Error("Gitee token is not configured.");
  }
  return token;
}

function withToken(url: URL, token: string) {
  url.searchParams.set("access_token", token);
  return url;
}

async function requestGitee<T>(url: URL, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gitee API ${response.status}: ${body.slice(0, 300)}`);
  }

  return (await response.json()) as T;
}

export class GiteeRepositoryAdapter {
  constructor(private readonly config: RepositoryConfig) {}

  async listFiles() {
    const token = requireToken(this.config);
    const url = withToken(
      new URL(
        `${apiBase}/repos/${this.config.owner}/${this.config.repo}/git/trees/${encodeURIComponent(this.config.branch)}`
      ),
      token
    );
    url.searchParams.set("recursive", "1");
    const result = await requestGitee<{ tree: GiteeTreeItem[]; sha?: string }>(url);
    return {
      commitSha: result.sha,
      files: (result.tree ?? []).filter((item) => item.type === "blob")
    };
  }

  private async getContentFile(sourcePath: string) {
    const token = requireToken(this.config);
    const url = withToken(
      new URL(
        `${apiBase}/repos/${this.config.owner}/${this.config.repo}/contents/${sourcePath
          .split("/")
          .map(encodeURIComponent)
          .join("/")}`
      ),
      token
    );
    url.searchParams.set("ref", this.config.branch);
    return requestGitee<GiteeContentFile>(url);
  }

  async getFileContent(sourcePath: string) {
    const file = await this.getContentFile(sourcePath);
    const content = file.content ? Buffer.from(file.content.replace(/\s/g, ""), "base64").toString("utf8") : "";
    return { ...file, content };
  }

  async getFileBuffer(sourcePath: string) {
    const file = await this.getContentFile(sourcePath);
    const buffer = Buffer.from(file.content ? file.content.replace(/\s/g, "") : "", "base64");
    return { ...file, buffer };
  }

  async updateFile(sourcePath: string, content: string, message: string) {
    const token = requireToken(this.config);
    const current = await this.getFileContent(sourcePath);
    const url = withToken(
      new URL(
        `${apiBase}/repos/${this.config.owner}/${this.config.repo}/contents/${sourcePath
          .split("/")
          .map(encodeURIComponent)
          .join("/")}`
      ),
      token
    );

    return requestGitee<Record<string, unknown>>(url, {
      method: "PUT",
      body: JSON.stringify({
        branch: this.config.branch,
        content: Buffer.from(content, "utf8").toString("base64"),
        message,
        sha: current.sha
      })
    });
  }
}
