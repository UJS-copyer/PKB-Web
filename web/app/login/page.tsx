import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth, signIn } from "@/auth";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Admin Login"
};

function normalizeCallbackUrl(value?: string) {
  if (!value || !value.startsWith("/")) {
    return "/admin";
  }
  return value;
}

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (session?.user?.email) {
    redirect("/admin");
  }

  const params = searchParams ? await searchParams : undefined;
  const rawCallback = params?.callbackUrl;
  const callbackUrl = normalizeCallbackUrl(Array.isArray(rawCallback) ? rawCallback[0] : rawCallback);

  async function signInWithGitHub() {
    "use server";
    await signIn("github", { redirectTo: callbackUrl });
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center px-4 py-16 sm:px-6 lg:px-8">
      <section className="w-full rounded-2xl border border-border/70 bg-card/80 p-8 shadow-sm backdrop-blur sm:p-10 lg:max-w-xl">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">Admin Access</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">登录后台</h1>
        <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
          使用已加入管理员白名单的 GitHub 账号登录。登录后会返回你刚才要访问的后台页面。
        </p>

        <form action={signInWithGitHub} className="mt-8">
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <Button type="submit" size="lg" className="w-full sm:w-auto">
            使用 GitHub 登录
          </Button>
        </form>

        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          当前本地地址请和运行端口保持一致，例如 `http://localhost:3001`。
        </p>
      </section>
    </main>
  );
}
