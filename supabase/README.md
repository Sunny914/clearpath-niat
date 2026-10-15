# Supabase setup — ClearPath NIAT

## 1. Create a project

1. Sign in at [https://supabase.com/dashboard](https://supabase.com/dashboard).
2. Create a new project (note the **Project URL** and **Database password**).

## 2. Apply the schema

**Option A — SQL Editor (recommended for hackathon)**

1. Open **SQL Editor** → **New query**.
2. Paste the contents of `supabase/migrations/20261014100000_initial_clearpath_schema.sql`.
3. Run the query.

**Option B — Supabase CLI**

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

## 3. Server environment variables

Add to `.env.local` (never commit):

| Variable | Where to find it |
|----------|------------------|
| `SUPABASE_URL` | Project Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → `service_role` (secret) |

Optional:

| Variable | Purpose |
|----------|---------|
| `SUPABASE_PERSISTENCE_ENABLED` | Set to `false` to skip DB writes while testing Gemini only |

The **service role key must only run on the server** (Next.js Route Handlers). Do not prefix with `NEXT_PUBLIC_`.

## 4. Verify

1. Run `npm run dev`.
2. Submit the intake form once.
3. In Supabase **Table Editor**, confirm rows in `leads`, `decision_briefs`, and `lead_events`.
4. `lead_events.payload` must not contain phone numbers.

## Security notes

- RLS is enabled on all tables with **no public policies** — clients cannot read student records via the anon key.
- Phone numbers are stored on `leads` for counsellor follow-up but are **not** sent to Gemini and **not** written to `lead_events.payload`.
