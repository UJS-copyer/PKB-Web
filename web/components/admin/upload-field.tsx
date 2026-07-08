"use client";

import { useEffect, useState } from "react";
import { Loader2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type UploadFieldProps = {
  name: string;
  label: string;
  defaultValue?: string | null;
  purpose: "avatar" | "resume" | "project-cover";
  accept: string;
};

const uploadLimits: Record<UploadFieldProps["purpose"], { maxSize: number; types: string[]; sizeLabel: string }> = {
  avatar: {
    maxSize: 2 * 1024 * 1024,
    types: ["image/png", "image/jpeg", "image/webp"],
    sizeLabel: "2MB"
  },
  resume: {
    maxSize: 4 * 1024 * 1024,
    types: ["application/pdf"],
    sizeLabel: "4MB"
  },
  "project-cover": {
    maxSize: 4 * 1024 * 1024,
    types: ["image/png", "image/jpeg", "image/webp"],
    sizeLabel: "4MB"
  }
};

function normalizeUploadErrorMessage(message: string) {
  if (/request entity too large|request body too large|payload too large/i.test(message)) {
    return "上传文件过大，请压缩后重试。";
  }
  if (/not valid json|unexpected token/i.test(message)) {
    return "上传接口返回了异常响应，请稍后重试。";
  }
  if (/request ent/i.test(message)) {
    return "上传请求被服务端拒绝，请稍后重试。";
  }
  return message;
}

export function UploadField({ name, label, defaultValue, purpose, accept }: UploadFieldProps) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setValue(defaultValue ?? "");
  }, [defaultValue]);

  async function upload(file?: File) {
    if (!file) return;
    const limit = uploadLimits[purpose];
    if (!limit.types.includes(file.type)) {
      setMessage("文件类型不支持。");
      return;
    }
    if (file.size > limit.maxSize) {
      setMessage(`文件大小不能超过 ${limit.sizeLabel}。`);
      return;
    }

    setUploading(true);
    setMessage(null);
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("purpose", purpose);
      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body
      });
      const raw = await response.text();
      let payload: { ok?: boolean; url?: string; error?: string } | null = null;
      try {
        payload = raw ? (JSON.parse(raw) as { ok?: boolean; url?: string; error?: string }) : null;
      } catch {
        payload = null;
      }
      if (!response.ok || !payload?.ok || !payload.url) {
        throw new Error(normalizeUploadErrorMessage(payload?.error ?? raw?.trim() ?? "上传失败。"));
      }
      setValue(payload.url);
      setMessage("上传成功，保存表单后生效。");
    } catch (error) {
      setMessage(normalizeUploadErrorMessage(error instanceof Error ? error.message : "上传失败。"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <label className="grid gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <Input name={name} value={value} onChange={(event) => setValue(event.target.value)} />
        <Button asChild type="button" variant="outline" disabled={uploading}>
          <span className="relative">
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
            上传
            <input
              type="file"
              accept={accept}
              className="absolute inset-0 cursor-pointer opacity-0"
              disabled={uploading}
              onChange={(event) => upload(event.target.files?.[0])}
            />
          </span>
        </Button>
      </div>
      {value ? (
        <a href={value} target="_blank" rel="noreferrer" className="text-xs text-accent underline-offset-4 hover:underline">
          打开当前文件
        </a>
      ) : null}
      {message ? <span className="text-xs text-muted-foreground">{message}</span> : null}
    </label>
  );
}

