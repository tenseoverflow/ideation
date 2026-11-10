# Muse

React + Vite + Tailwind with a Cloudflare Worker and Workers AI.

Run `npm install`, `npx wrangler login`, then `npm run dev`. Local AI requests use your Cloudflare account remotely and consume Workers AI usage. No API key belongs in the frontend.

Check with `npm run typecheck` and `npm run build`. Deploy with `npm run deploy` after signing in. The Worker serves the app and `/api/muse` together.

Session data is held in memory and clears on refresh. This is a prototype without authentication; add access controls before a public launch. The review comparison action is still a local placeholder.

## Projects and D1

Projects have a name, challenge and one resumable session. Session edits autosave after 500 ms. Conflicting tab saves require an explicit reload or replace action.

Create a database with `npx wrangler d1 create muse`, then replace the placeholder database ID in wrangler.jsonc. Apply migrations with `npx wrangler d1 migrations apply muse --local` for development and `npx wrangler d1 migrations apply muse --remote` for production. The migration seeds the bookstore once.

Local development uses `.dev.vars` containing `ALLOW_LOCAL=true`. Never configure ALLOW_LOCAL in production. Before deployment enable Worker-level Cloudflare Access for all traffic (production and previews) and allow only your email. The API rejects deployed requests without Access context. Run `npm run typecheck`, `npm run build`, then `npm run deploy`.
