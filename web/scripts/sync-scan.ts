import fs from "node:fs";
import path from "node:path";

const vaultRoot = path.resolve(process.env.OBSIDIAN_VAULT_PATH ?? path.join(process.cwd(), "..", "obsidian"));
const stack = [vaultRoot];
let notes = 0;
let assets = 0;

while (stack.length > 0) {
  const current = stack.pop();
  if (!current || !fs.existsSync(current)) continue;

  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === ".obsidian" || entry.name === "node_modules") continue;
    const absolute = path.join(current, entry.name);
    if (entry.isDirectory()) {
      stack.push(absolute);
      continue;
    }
    const extension = path.extname(entry.name).toLowerCase();
    if (extension === ".md") notes += 1;
    if ([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".tif", ".tiff"].includes(extension)) assets += 1;
  }
}

console.log(JSON.stringify({ path: vaultRoot, notes, assets }, null, 2));
