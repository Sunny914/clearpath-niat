import type { N8nPreparedForReview } from "@/lib/n8n/parse-n8n-prepared-response";
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
  /** Present when n8n returned `prepared_for_review` for this save (counsellor UI only). */
  n8nFollowUp?: N8nPreparedForReview | null;
};

export const BRIEF_PERSISTENCE_HEADER = "X-ClearPath-Persistence";
export const BRIEF_LEAD_ID_HEADER = "X-ClearPath-Lead-Id";
export const BRIEF_IDEMPOTENCY_KEY_HEADER = "X-ClearPath-Idempotency-Key";
