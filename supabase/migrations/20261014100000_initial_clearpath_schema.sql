-- ClearPath NIAT prototype schema (server-side access only via service role).
-- Apply in Supabase SQL Editor or: supabase db push (when using Supabase CLI linked project).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- leads
-- ---------------------------------------------------------------------------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  request_id text not null,
  idempotency_key text,
  workflow_status text not null default 'brief_generated'
    check (workflow_status in ('intake_saved', 'brief_generated', 'completed', 'persistence_error')),
  preferred_next_step text not null,
  main_concern text not null,
  main_concern_other text not null default '',
  concern_category text,
  application_status text not null,
  consent_data_processing boolean not null default false,
  consent_counselling_contact boolean not null default false,
  phone_number text,
  intake_snapshot jsonb not null,
  constraint leads_request_id_unique unique (request_id),
  constraint leads_idempotency_key_unique unique (idempotency_key)
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);

-- ---------------------------------------------------------------------------
-- decision_briefs
-- ---------------------------------------------------------------------------
create table if not exists public.decision_briefs (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  created_at timestamptz not null default now(),
  brief_source text not null check (brief_source in ('gemini', 'mock-development')),
  stated_concern_category text not null,
  evidence_based_response jsonb not null,
  verified_source_links jsonb not null,
  unanswered_questions jsonb not null,
  counsellor_pre_call_summary text not null,
  recommended_next_action text not null,
  recommended_next_action_rationale text not null,
  constraint decision_briefs_lead_id_unique unique (lead_id)
);

-- ---------------------------------------------------------------------------
-- lead_events (audit trail — no phone numbers in payload)
-- ---------------------------------------------------------------------------
create table if not exists public.lead_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads (id) on delete set null,
  created_at timestamptz not null default now(),
  request_id text not null,
  event_type text not null check (
    event_type in (
      'brief_requested',
      'brief_generated',
      'lead_persisted',
      'duplicate_submission',
      'persistence_failed'
    )
  ),
  message text,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists lead_events_lead_id_idx on public.lead_events (lead_id);
create index if not exists lead_events_request_id_idx on public.lead_events (request_id);

-- ---------------------------------------------------------------------------
-- Row Level Security — deny anonymous/authenticated direct access
-- ---------------------------------------------------------------------------
alter table public.leads enable row level security;
alter table public.decision_briefs enable row level security;
alter table public.lead_events enable row level security;

-- No SELECT/INSERT/UPDATE policies for anon or authenticated roles.
-- Server uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS.

comment on table public.leads is 'Lead intake; phone stored for counsellor follow-up — server access only.';
comment on column public.leads.consent_data_processing is 'Consent to process intake for decision brief generation.';
comment on column public.leads.consent_counselling_contact is 'Separate consent for phone contact about counselling call requests.';
