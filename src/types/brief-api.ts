import type { DecisionBriefResult } from "@/types/lead";

export type BriefPersistenceStatus =
  | "saved"
  | "duplicate"
  | "failed"
  | "not_configured";

export type BriefApiSuccessResponse = {
  /** Whether the lead and brief were stored in Supabase */
  persistence: BriefPersistenceStatus;
  /** Public lead reference (DB `leads.id` when saved, otherwise API request id) */
  leadReferenceId: string;
  requestId: string;
  brief: DecisionBriefResult;
};

export const BRIEF_PERSISTENCE_HEADER = "X-ClearPath-Persistence";
export const BRIEF_LEAD_ID_HEADER = "X-ClearPath-Lead-Id";
export const BRIEF_IDEMPOTENCY_KEY_HEADER = "X-ClearPath-Idempotency-Key";
