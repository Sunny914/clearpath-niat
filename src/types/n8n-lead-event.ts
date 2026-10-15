import type { LeadIntakeFormData } from "@/types/lead";
import type { BriefPersistenceStatus } from "@/types/brief-api";

/** Payload contract for n8n workflow `Validate & Prepare Draft` (see n8n-files/workflow1.json). */
export type N8nLeadPersistedEvent = {
  eventType: "lead_persisted";
  persistence: "saved";
  leadId: string;
  requestId: string;
  preferredNextStep: LeadIntakeFormData["preferredNextStep"];
  applicationStatus: LeadIntakeFormData["applicationStatus"];
  counsellingContactConsent: boolean;
  brief: {
    statedConcernCategory: string;
    recommendedNextAction: string;
    recommendedNextActionRationale: string;
  };
};

export type N8nNotifyOutcome =
  | "skipped_not_configured"
  | "skipped_not_eligible"
  | "success"
  | "http_error"
  | "timeout"
  | "network_error";

export function shouldTriggerN8nFollowUp(
  persistence: BriefPersistenceStatus,
): boolean {
  return persistence === "saved";
}
