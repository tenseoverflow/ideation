# Muse

React + Vite + Tailwind with a Cloudflare Worker and Workers AI.

Run `npm install`, then `npm run dev`. No Cloudflare login is needed for local development. The dev server disables remote bindings, bypasses Access locally, and returns 15 sample ideas instead of calling Workers AI. These are placeholders for testing the design and flow. Local database migrations run automatically before the dev server starts. No API key belongs in the frontend.

For real AI, sign in with `npx wrangler login` and run `npm run dev:ai`. This keeps the app and database local while calling remote Workers AI, which consumes your Cloudflare AI usage. Failures show a retry message; real-AI mode never silently substitutes sample ideas. Photo sparks uses written observations (it does not see the image); Role play uses the selected role. Both return 15 idea sparks.

Check AI response handling with `npm run test:ai`. Check with `npm run typecheck` and `npm run build`. Deploy with `npm run deploy` after signing in. The Worker serves the app and `/api/muse` together.

Projects and sessions persist in D1 (a separate local database during development). The review comparison action is still a local placeholder.

## Projects and D1

Projects have a name, challenge and one resumable session. Session edits autosave after 500 ms. Conflicting tab saves require an explicit reload or replace action.

Create a database with `npx wrangler d1 create muse`, then replace the placeholder database ID in wrangler.jsonc. Apply migrations with `npx wrangler d1 migrations apply muse --local` for development and `npx wrangler d1 migrations apply muse --remote` for production. The migration seeds the bookstore once.

The Vite dev server sets `ALLOW_LOCAL=true` and `MOCK_AI=true` automatically; no `.dev.vars` file is required. Never configure these flags in production. Production builds keep the real Workers AI binding and Access checks. Before deployment enable Worker-level Cloudflare Access for all traffic (production and previews) and allow only your email. The API rejects deployed requests without Access context. Run `npm run typecheck`, `npm run build`, then `npm run deploy`.

## Random photo sparks

Configure `UNSPLASH_ACCESS_KEY` in the local `.dev.vars` file and as a Cloudflare Worker secret (`bunx wrangler secret put UNSPLASH_ACCESS_KEY`). Keep this key out of frontend code. Photo sparks fetches randomized batches across Unsplash; queues persist with the project session. Missing credentials or Unsplash errors show a retry state. New sessions receive a fresh queue. The homepage demonstration remains illustrative.

In review, Photo sparks uses Workers AI Llama 4 Scout to read the displayed image together with the project challenge and the user's thoughts. Role play remains text-only. Speech transcription/grouping does not receive image context. Run `bun run dev:ai` for live Workers AI testing.
