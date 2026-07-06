export function adminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null) {
  const allowList = adminEmails();
  if (process.env.NODE_ENV === "development" && allowList.length === 0) {
    return true;
  }
  return Boolean(email && allowList.includes(email.toLowerCase()));
}
