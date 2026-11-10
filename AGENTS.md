# Muse

Standalone React + Vite + Tailwind app hosted on Cloudflare Workers.
Use KISS and DRY. Main UI: src/App.tsx. Shared AI types: src/muse.ts. API: worker/index.ts.
Run npm run dev for development; AI binding uses remote Workers AI.
Run npm run typecheck and npm run build before handoff. Deploy with npm run deploy.
Use Tailwind v4 and src/index.css. Never put Cloudflare credentials in frontend code.
