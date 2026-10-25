# Pickl

A shared trip chat with a quiet organiser and an editable trip board.

## Run

Requires Node 22.13+ and npm. For a fresh local database:

```sh
npm ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 migrations apply DB --local --config dist/server/wrangler.json --persist-to .wrangler/state
npm run dev
```

Open the loopback URL printed by the server, normally `http://127.0.0.1:5173`. Set the AI key as described below before testing captures. Keep the same hostname to retain the guest cookie. Local and hosted databases are separate. Existing installations must apply the pending migrations `0002` (capture jobs/usage) and `0003` (day/time fields) before running this version. Previously applied migrations must not be replayed manually. Use `npm run db:generate` only when changing the schema and commit the generated SQL and metadata.

## Behaviour

- Each trip has a chat, members, an invitation token and a board. Group names are editable; participants are visible; the creator can delete a group with confirmation. Double-clicking a message or using Reply quotes it.
- Only trip members can read or mutate its records. Organisers can rotate invitation links.
- Messages are persisted; the UI refreshes every three seconds while visible and displays the newest 300 messages.
- Only messages containing a standalone `@Pickl` trigger extraction. Text and links are supported. OpenAI interprets tagged instructions, their quoted message (if any), and up to 60 saved plans within a bounded context. Ordinary untagged messages are not sent to the model. Links are not fetched.
- Clear instructions create, update or archive plans; unresolved instructions, ambiguous references and genuinely conflicting information create review cards and leave existing plans untouched. Understandable but unfinished ideas are Options; missing prices, exact venues, links or booking details do not require review. Relative labels such as Day 1 are retained. Booked records a booking reported by the group, never a reservation made by Pickl.
- Trip info adapts to the records: stays are highlighted, scheduled meals/activities/travel share a daily itinerary, and unscheduled decisions, ideas and useful notes are grouped. Explicit day/time fields are editable. Missing dates remain unscheduled; no date is guessed from prose. Related stay details update the existing accommodation record.
- Board changes are version checked and recorded; undo rejects if another update has since occurred.
- Pickl never sends a chat message, books anything, or performs proactive actions. New mentions trigger a bubble-anchored mascot animation. Pure banter saves nothing and can trigger a temporary deadpan reaction; the happy and deadpan stages are serialized without replaying history.
- Generated notes contain useful trip facts, without missing-detail nags or commentary on the group’s tone. Existing saved data remains intact; standalone boilerplate is hidden in the display and remains available in the editor.
- Messages and capture jobs are stored before AI processing; the message sends immediately while AI runs in the Worker background. Failures appear beside the message with Retry (up to three attempts); plans can also be added manually in Trip info. A concurrent edit creates a review card rather than overwriting someone’s changes.
- AI calls have a 25-second timeout, five-change output cap and server-enforced limits of 30 requests per guest per hour, 200 per trip per day, and 1,000 per site per day. Failed calls count. Guest identity is not verified, so these are initial spending safeguards, not strong per-person quotas.

## Hosting and access

The Site is public. Chat messages remain private to members. A valid invitation grants membership to a guest session after a display name is entered. Display names are unverified. Clearing cookies loses that browser identity; reopen an invite to rejoin. Every chat API request requires a valid session and membership, except creating a chat or accepting a valid invitation. Replacing an invite stops new joins through the old link without removing existing members.

Guest sessions and plans are stored in D1. Set `OPENAI_API_KEY` in ignored `.dev.vars` for local Workers development and as a secret through Sites environment settings for hosting. `OPENAI_MODEL` optionally overrides `gpt-5-mini`. Redeploy a saved Site version after updating hosted secrets. Never put keys in browser code or source control. API requests use `store: false`; OpenAI account data policies still apply.

Review recent records through Trip info. Existing rule-parsed records are preserved; AI processes new tags and explicit retries rather than reprocessing historical conversations.

## Validation

`node --experimental-strip-types --test app/*.test.ts`

`npx tsc --noEmit`

`npm run build`

Live review-policy regression checks (uses the configured OpenAI key and makes billable API requests): `node --experimental-strip-types scripts/eval-review.ts`. An optional argument filters case names.

Trip-wide routines use `day: Every day` and appear once in an Every day callout next to accommodation. They are not duplicated across itinerary days or put into the unscheduled shortlist. Explicit daily recurrence in older notes with no assigned day is supported; one-off entries remain on their assigned day.
