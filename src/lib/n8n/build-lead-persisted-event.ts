import type { N8nLeadPersistedEvent } from "@/types/n8n-lead-event";
import type { DecisionBriefResult, LeadIntakeFormData } from "@/types/lead";

export type BuildN8nEventInput = {
  leadId: string;
  requestId: string;
  lead: LeadIntakeFormData;
  brief: DecisionBriefResult;
};

export function buildN8nLeadPersistedEvent(
  input: BuildN8nEventInput,
): N8nLeadPersistedEvent {
  return {
    eventType: "lead_persisted",
    persistence: "saved",
    leadId: input.leadId,
    requestId: input.requestId,
    preferredNextStep: input.lead.preferredNextStep,
    applicationStatus: input.lead.applicationStatus,
    counsellingContactConsent: input.lead.counsellingContactConsent,
    brief: {
      statedConcernCategory: input.brief.statedConcernCategory,
      recommendedNextAction: input.brief.recommendedNextAction,
      recommendedNextActionRationale: input.brief.recommendedNextActionRationale,
    },
  };
}

/** Guard for tests — payload must not contain PII fields. */
export function n8nPayloadContainsForbiddenFields(
  payload: N8nLeadPersistedEvent,
): boolean {
  const serialized = JSON.stringify(payload);
  const forbiddenKeys = [
    "phoneNumber",
    "studentName",
    "intake_snapshot",
    "phone_number",
    "N8N_WEBHOOK_SECRET",
  ];
  return forbiddenKeys.some((key) => serialized.includes(`"${key}"`));
}
