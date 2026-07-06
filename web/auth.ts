import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { adminEmails, isAdminEmail } from "@/lib/admin/access";

function githubProviders() {
  const clientId = process.env.AUTH_GITHUB_ID;
  const clientSecret = process.env.AUTH_GITHUB_SECRET;

  if (!clientId || !clientSecret) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "GitHub OAuth is not configured. Set AUTH_GITHUB_ID and AUTH_GITHUB_SECRET to enable admin login."
      );
    }
    return [];
  }

  return [GitHub({ clientId, clientSecret })];
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: githubProviders(),
  callbacks: {
    async signIn({ user }) {
      const allowList = adminEmails();
      if (process.env.NODE_ENV === "development" && allowList.length === 0) {
        return true;
      }
      return isAdminEmail(user.email);
    }
  }
});
