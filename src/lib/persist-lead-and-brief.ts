import type { SupabaseClient } from "@supabase/supabase-js";
import type { BriefGenerationSource } from "@/types/brief-generation";
import type { BriefPersistenceStatus } from "@/types/brief-api";
import type { DecisionBriefResult, LeadIntakeFormData } from "@/types/lead";

export type LeadWorkflowStatus =
  | "intake_saved"
  | "brief_generated"
  | "completed"
  | "persistence_error";

export type PersistLeadInput = {
  requestId: string;
  idempotencyKey: string | null;
  lead: LeadIntakeFormData;
  brief: DecisionBriefResult;
  source: BriefGenerationSource;
};

export type PersistLeadSuccess = {
  ok: true;
  status: Extract<BriefPersistenceStatus, "saved" | "duplicate">;
  leadId: string;
};

export type PersistLeadFailure = {
  ok: false;
  status: Extract<BriefPersistenceStatus, "failed">;
  errorCategory: string;
};

export type PersistLeadResult = PersistLeadSuccess | PersistLeadFailure;

export type ExistingPersistedLead = {
  leadId: string;
  brief: DecisionBriefResult;
  source: BriefGenerationSource;
};

/** Intake snapshot for JSONB — excludes phone (stored in dedicated column only). */
export function buildIntakeSnapshotForStorage(
  lead: LeadIntakeFormData,
): Record<string, unknown> {
  const snapshot: Record<string, unknown> = { ...lead };
  delete snapshot.phoneNumber;
  return snapshot;
}

export function redactLeadForEventPayload(
  lead: LeadIntakeFormData,
): Record<string, unknown> {
  return {
    ...buildIntakeSnapshotForStorage(lead),
    phoneProvided: Boolean(lead.phoneNumber.trim()),
    consentDataProcessing: lead.consent,
    consentCounsellingContact: lead.counsellingContactConsent,
  };
}

export function mapBriefRowToDecisionBriefResult(row: {
  stated_concern_category: string;
  evidence_based_response: unknown;
  verified_source_links: unknown;
  unanswered_questions: unknown;
  counsellor_pre_call_summary: string;
  recommended_next_action: string;
  recommended_next_action_rationale: string;
}): DecisionBriefResult | null {
  if (
    !Array.isArray(row.evidence_based_response) ||
    !Array.isArray(row.verified_source_links) ||
    !Array.isArray(row.unanswered_questions)
  ) {
    return null;
  }
  return {
    statedConcernCategory: row.stated_concern_category,
    evidenceBasedResponse: row.evidence_based_response as string[],
    verifiedSourceLinks: row.verified_source_links as DecisionBriefResult["verifiedSourceLinks"],
    unansweredQuestionsForHumanConfirmation:
      row.unanswered_questions as string[],
    counsellorPreCallSummary: row.counsellor_pre_call_summary,
    recommendedNextAction: row.recommended_next_action,
    recommendedNextActionRationale: row.recommended_next_action_rationale,
  };
}

export async function findExistingLeadByIdempotencyKey(
  supabase: SupabaseClient,
  idempotencyKey: string,
): Promise<ExistingPersistedLead | null> {
  const { data: leadRow, error: leadError } = await supabase
    .from("leads")
    .select("id")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (leadError || !leadRow) {
    return null;
  }

  const { data: briefRow, error: briefError } = await supabase
    .from("decision_briefs")
    .select(
      "stated_concern_category, evidence_based_response, verified_source_links, unanswered_questions, counsellor_pre_call_summary, recommended_next_action, recommended_next_action_rationale, brief_source",
    )
    .eq("lead_id", leadRow.id)
    .maybeSingle();

  if (briefError || !briefRow) {
    return null;
  }

  const brief = mapBriefRowToDecisionBriefResult(briefRow);
  if (!brief) {
    return null;
  }

  const source = briefRow.brief_source as BriefGenerationSource;
  if (source !== "gemini" && source !== "mock-development") {
    return null;
  }

  return { leadId: leadRow.id, brief, source };
}

export async function persistLeadAndBrief(
  supabase: SupabaseClient,
  input: PersistLeadInput,
): Promise<PersistLeadResult> {
  const { requestId, idempotencyKey, lead, brief, source } = input;

  if (idempotencyKey) {
    const existing = await findExistingLeadByIdempotencyKey(
      supabase,
      idempotencyKey,
    );
    if (existing) {
      await insertLeadEvent(supabase, {
        leadId: existing.leadId,
        requestId,
        eventType: "duplicate_submission",
        message: "Returned existing lead for idempotency key",
        payload: { idempotencyKey },
      });
      return { ok: true, status: "duplicate", leadId: existing.leadId };
    }
  }

  const { data: leadInsert, error: leadError } = await supabase
    .from("leads")
    .insert({
      request_id: requestId,
      idempotency_key: idempotencyKey,
      workflow_status: "brief_generated" satisfies LeadWorkflowStatus,
      preferred_next_step: lead.preferredNextStep,
      main_concern: lead.mainConcern,
      main_concern_other: lead.mainConcernOther,
      concern_category: brief.statedConcernCategory,
      application_status: lead.applicationStatus,
      consent_data_processing: lead.consent,
      consent_counselling_contact: lead.counsellingContactConsent,
      phone_number: lead.phoneNumber.trim() || null,
      intake_snapshot: buildIntakeSnapshotForStorage(lead),
    })
    .select("id")
    .single();

  if (leadError || !leadInsert) {
    if (idempotencyKey && leadError?.code === "23505") {
      const existing = await findExistingLeadByIdempotencyKey(
        supabase,
        idempotencyKey,
      );
      if (existing) {
        return { ok: true, status: "duplicate", leadId: existing.leadId };
      }
    }
    await insertLeadEvent(supabase, {
      leadId: null,
      requestId,
      eventType: "persistence_failed",
      message: "Lead insert failed",
      payload: { stage: "leads_insert", code: leadError?.code ?? "unknown" },
    });
    return {
      ok: false,
      status: "failed",
      errorCategory: leadError?.code ?? "leads_insert",
    };
  }

  const leadId = leadInsert.id as string;

  const { error: briefError } = await supabase.from("decision_briefs").insert({
    lead_id: leadId,
    brief_source: source,
    stated_concern_category: brief.statedConcernCategory,
    evidence_based_response: brief.evidenceBasedResponse,
    verified_source_links: brief.verifiedSourceLinks,
    unanswered_questions: brief.unansweredQuestionsForHumanConfirmation,
    counsellor_pre_call_summary: brief.counsellorPreCallSummary,
    recommended_next_action: brief.recommendedNextAction,
    recommended_next_action_rationale: brief.recommendedNextActionRationale,
  });

  if (briefError) {
    await supabase
      .from("leads")
      .update({ workflow_status: "persistence_error" })
      .eq("id", leadId);
    await insertLeadEvent(supabase, {
      leadId,
      requestId,
      eventType: "persistence_failed",
      message: "Brief insert failed",
      payload: { stage: "decision_briefs_insert", code: briefError.code },
    });
    return {
      ok: false,
      status: "failed",
      errorCategory: briefError.code ?? "decision_briefs_insert",
    };
  }

  await insertLeadEvent(supabase, {
    leadId,
    requestId,
    eventType: "lead_persisted",
    message: "Lead and decision brief saved",
    payload: redactLeadForEventPayload(lead),
  });

  return { ok: true, status: "saved", leadId };
}

async function insertLeadEvent(
  supabase: SupabaseClient,
  args: {
    leadId: string | null;
    requestId: string;
    eventType:
      | "brief_requested"
      | "brief_generated"
      | "lead_persisted"
      | "duplicate_submission"
      | "persistence_failed";
    message: string;
    payload: Record<string, unknown>;
  },
): Promise<void> {
  await supabase.from("lead_events").insert({
    lead_id: args.leadId,
    request_id: args.requestId,
    event_type: args.eventType,
    message: args.message,
    payload: args.payload,
  });
}

export async function recordBriefGeneratedEvent(
  supabase: SupabaseClient,
  requestId: string,
  lead: LeadIntakeFormData,
  source: BriefGenerationSource,
): Promise<void> {
  await insertLeadEvent(supabase, {
    leadId: null,
    requestId,
    eventType: "brief_generated",
    message: `Brief generated via ${source}`,
    payload: {
      ...redactLeadForEventPayload(lead),
      briefSource: source,
    },
  });
}
