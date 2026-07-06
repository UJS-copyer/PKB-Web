import "server-only";

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminEmail } from "./access";

export class AdminAuthError extends Error {
  status: 401 | 403;

  constructor(status: 401 | 403, message: string) {
    super(message);
    this.name = "AdminAuthError";
    this.status = status;
  }
}

export async function isAdminSession() {
  const session = await auth();
  return isAdminEmail(session?.user?.email);
}

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.email) {
    throw new AdminAuthError(401, "Authentication required.");
  }
  if (!isAdminEmail(session.user.email)) {
    throw new AdminAuthError(403, "Administrator access required.");
  }
  return session;
}

export function adminAuthErrorResponse(error: unknown) {
  if (error instanceof AdminAuthError) {
    return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
  }
  return null;
}
