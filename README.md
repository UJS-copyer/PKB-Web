# PKB-Web

Personal Knowledge Base and digital garden built with Next.js.

## App

The production web app lives in `web/`.

Vercel settings:

- Root Directory: `web`
- Build Command: `npm run prisma:generate && npm run build`
- Framework Preset: Next.js

## Local Development

```bash
cd web
npm install
npm run dev
```

## Quality Checks

```bash
cd web
npm run typecheck
npm run lint
npm run build
```

## Notes

- Obsidian remains the single source of truth for content.
- Runtime secrets must be configured in Vercel environment variables.
- Do not commit `.env.local`, `prisma/.env`, `.data`, `.next`, or `node_modules`.
