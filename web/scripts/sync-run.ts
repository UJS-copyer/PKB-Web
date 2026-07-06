const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000";
const response = await fetch(`${baseUrl}/api/admin/sync`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ action: "sync" })
});

if (!response.ok) {
  throw new Error(`Sync request failed: ${response.status} ${await response.text()}`);
}

console.log(await response.text());

export {};
