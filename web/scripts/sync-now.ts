import fs from "node:fs";
import Module from "node:module";
import path from "node:path";

type ModuleLoader = (this: unknown, request: string, parent: unknown, isMain: boolean) => unknown;
const moduleWithLoad = Module as typeof Module & { _load: ModuleLoader };
const originalLoad = moduleWithLoad._load;

moduleWithLoad._load = function patchedLoad(request: string, parent: unknown, isMain: boolean) {
  if (request === "server-only") {
    return {};
  }
  return originalLoad.call(this, request, parent, isMain);
};

function loadEnvFile(relativePath: string) {
  const filePath = path.resolve(process.cwd(), relativePath);
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const index = trimmed.indexOf("=");
    if (index === -1) continue;

    const key = trimmed.slice(0, index).trim();
    const rawValue = trimmed.slice(index + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");
    process.env[key] ??= value;
  }
}

loadEnvFile(".env.local");
loadEnvFile("prisma/.env");

async function main() {
  const { enqueueSyncJob, runSyncJob } = await import("../lib/sync/runner");
  const { prisma } = await import("../lib/db/prisma");

  const job = await enqueueSyncJob("manual");
  await runSyncJob(job.id);

  const [notes, assets, tags, links, latestJob, logs] = await Promise.all([
    prisma.note.count({ where: { status: "active" } }),
    prisma.asset.count({ where: { status: "active" } }),
    prisma.tag.count(),
    prisma.link.count(),
    prisma.syncJob.findUnique({ where: { id: job.id } }),
    prisma.syncLog.findMany({
      where: { jobId: job.id },
      orderBy: { createdAt: "desc" },
      take: 8
    })
  ]);

  console.log(
    JSON.stringify(
      {
        ok: latestJob?.status === "success",
        jobId: job.id,
        status: latestJob?.status,
        error: latestJob?.error,
        notes,
        assets,
        tags,
        links,
        logs: logs.map((log) => ({
          level: log.level,
          step: log.step,
          message: log.message
        }))
      },
      null,
      2
    )
  );

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

export {};
