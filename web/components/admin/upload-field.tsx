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

export function UploadField({ name, label, defaultValue, purpose, accept }: UploadFieldProps) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setValue(defaultValue ?? "");
  }, [defaultValue]);

  async function upload(file?: File) {
    if (!file) return;
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
      const payload = (await response.json()) as { ok?: boolean; url?: string; error?: string };
      if (!response.ok || !payload.ok || !payload.url) {
        throw new Error(payload.error ?? "上传失败。");
      }
      setValue(payload.url);
      setMessage("上传成功，保存表单后生效。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "上传失败。");
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
      {message ? <span className="text-xs text-muted-foreground">{message}</span> : null}
    </label>
  );
}

