import crypto from "node:crypto";

const algorithm = "aes-256-gcm";

function key() {
  const source =
    process.env.APP_ENCRYPTION_KEY ||
    process.env.AUTH_SECRET ||
    "local-development-only-change-before-production";
  return crypto.createHash("sha256").update(source).digest();
}

export function encryptSecret(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(algorithm, key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function decryptSecret(value?: string) {
  if (!value) return "";
  try {
    const raw = Buffer.from(value, "base64url");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const encrypted = raw.subarray(28);
    const decipher = crypto.createDecipheriv(algorithm, key(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    return "";
  }
}

export function hashSecret(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function verifySecret(value: string, hash?: string) {
  if (!hash) return false;
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hashSecret(value)));
}
