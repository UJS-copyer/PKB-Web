import { z } from "zod";
import { defaultRepositoryConfig, maskSecret } from "./defaults";
import type { RepositoryConfig, SyncMode } from "./types";
import { encryptSecret, hashSecret } from "@/lib/security/crypto";

export const repositoryFormSchema = z.object({
  repoUrl: z.string().url(),
  branch: z.string().min(1).default("master"),
  syncMode: z.enum(["manual", "auto"]).default("manual"),
  token: z.string().optional(),
  webhookSecret: z.string().optional()
});

export function parseGiteeRepoUrl(repoUrl: string) {
  const url = new URL(repoUrl);
  const [owner, repoWithSuffix] = url.pathname.replace(/^\/+/, "").split("/");
  const repo = repoWithSuffix?.replace(/\.git$/i, "");

  if (url.hostname !== "gitee.com" || !owner || !repo) {
    throw new Error("Only Gitee repository URLs like https://gitee.com/owner/repo are supported.");
  }

  return { owner, repo };
}

export function repositoryFromForm(input: z.infer<typeof repositoryFormSchema>, previous?: RepositoryConfig) {
  const parsed = parseGiteeRepoUrl(input.repoUrl);
  const next: RepositoryConfig = {
    ...defaultRepositoryConfig,
    ...previous,
    provider: "gitee",
    repoUrl: input.repoUrl,
    owner: parsed.owner,
    repo: parsed.repo,
    branch: input.branch,
    syncMode: input.syncMode as SyncMode
  };

  if (input.token?.trim()) {
    next.tokenEncrypted = encryptSecret(input.token.trim());
    next.tokenMasked = maskSecret(input.token.trim());
  }

  if (input.webhookSecret?.trim()) {
    next.webhookSecretHash = hashSecret(input.webhookSecret.trim());
    next.webhookSecretMasked = maskSecret(input.webhookSecret.trim());
  }

  return next;
}
