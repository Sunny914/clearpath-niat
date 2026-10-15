# n8n follow-up integration — ClearPath NIAT

The Next.js app notifies n8n **only after a new successful Supabase save** (`persistence === "saved"`). It does **not** send messages or book counselling calls; n8n prepares a draft for human review.

## Environment variables (server-only)

Add to `.env.local` (never commit):

| Variable | Purpose |
|----------|---------|
| `N8N_WEBHOOK_URL` | Full webhook URL (use the URL you configure — not overridden by the app) |
| `N8N_WEBHOOK_SECRET` | Shared secret; sent as header `x-clearpath-secret` |
| `N8N_TIMEOUT_MS` | Optional outbound timeout (ms), default `8000` |

Do **not** use `NEXT_PUBLIC_*` for these values.

## Webhook URLs in n8n

| URL | When to use |
|-----|-------------|
| `http://localhost:5678/webhook-test/clearpath-lead` | **Test mode** — workflow **inactive**, click **Listen for test event**; one-shot per listen |
| `http://localhost:5678/webhook/clearpath-lead` | **Production** — workflow must be **Active** |

Set `N8N_WEBHOOK_URL` in `.env.local` to the URL you intend to use. For day-to-day local dev with an **active** workflow, use `/webhook/clearpath-lead`. For manual curl tests against an inactive workflow, use `/webhook-test/...` separately (do not rely on the app unless that test URL is what you configured).

## Start n8n (Docker Desktop)

Run your n8n container so `http://localhost:5678` is reachable. Import or open workflow **ClearPath NIAT - Lead Follow-up** (`n8n-files/workflow1.json` is a reference export).

### n8n UI checklist

1. **ClearPath Webhook** node: path `clearpath-lead`, **Header Auth**, header name `x-clearpath-secret`, credential **ClearPath Webhook Auth** (value matches `N8N_WEBHOOK_SECRET` in `.env.local`).
2. For production use with the app: **Activate** the workflow.
3. Confirm **Validate & Prepare Draft** matches the payload fields documented in `src/types/n8n-lead-event.ts`.

## End-to-end synthetic test (safe)

1. Configure Supabase + Gemini (or mock) so `/api/brief` returns `persistence: "saved"`.
2. Set `N8N_WEBHOOK_URL` to your active webhook URL and matching secret.
3. Submit the intake form with **fictional** data only.
4. In n8n **Executions**, confirm a run with HTTP 200 and response `status: "prepared_for_review"`, `messageSent: false`, `counsellingBooked: false`.
5. Dev server logs may show `[n8n/follow-up] ... outcome=success` (no payload or secret logged).

## Privacy

Outbound JSON excludes phone numbers, student names, and full intake snapshots. Phone remains in Supabase only for counsellor workflows, not in the n8n POST body.
