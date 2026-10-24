# Pickl · holiday_agent

A minimal group chat for friends planning a holiday. Create a chat, share an invitation, and join with a display name. No ChatGPT account is required.

## Features

- One-button chat creation and browser-specific recent chats.
- Invitations that grant membership; chat URLs alone do not grant access.
- Editable group names and a participant list.
- Creator-only group deletion with confirmation, removing messages, plans, membership and invite access.
- Double-click or use Reply to send quoted replies.
- Gigi mascot in the homepage and chat header; new `@Pickl` mentions trigger a small bubble-anchored head animation. Historical mentions do not replay, and reduced-motion preferences are respected.
- Persistent messages, grouped by sender, refreshed every 2.5 seconds while the tab is visible.
- Brand gradient, distinct incoming/outgoing bubbles, and highlighted `@Pickl` mentions.
- Explicit `@Pickl` instructions are parsed into trip records. The chat shows Saved or Needs review based on those records, without bot replies.

The organiser currently uses conservative rules rather than an LLM. Saved trip records and review operations exist in the backend; a planning-board interface is not part of the current UI. Uploads, notifications, booking actions and end-to-end encryption are not implemented. The UI displays the latest 300 messages per chat.

## Run locally

Requires Node.js 22.13 or later and npm.

```sh
npm ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_productive_bloodscream.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_high_peter_quill.sql
npm run dev
```

Open the loopback URL printed by the development server, normally `http://127.0.0.1:5173`. Enter a display name to create or join a chat. Keep using the same hostname so the browser retains its session cookie. Local and hosted databases are separate. Run the two SQL commands only when setting up a fresh local database; they are not intended to be replayed on an existing one.

To generate a migration after changing the schema, run `npm run db:generate`. Commit the resulting SQL and Drizzle metadata. Do not change previously applied migrations.

## Access and storage

A random guest-session token is stored in an HttpOnly, SameSite cookie for 180 days. Only its SHA-256 hash is stored in D1. Production cookies use Secure. Names are self-chosen and are not verified identities.

Every chat read and mutation checks membership server-side. Anyone holding a valid invitation can join. Clearing cookies or changing browsers loses that browser identity; use the invitation to rejoin. Replacing an invitation stops future joins through the old link without removing existing members. Invitation rotation is currently a backend operation.

## Validation

```sh
node --experimental-strip-types --test app/extract.test.ts app/mention-tracker.test.ts
npx tsc --noEmit
npm run build
```

## Hosting

The current deployment runs through Sites on Cloudflare Workers with a D1 database. `.openai/hosting.json` retains that deployment identity. The source includes the Vinext starter's hosting integration and UI primitives. No API keys or runtime credentials are committed. Keep `.env*`, `.dev.vars*`, session data, build output and `node_modules` out of Git.
