import type { N8nNotifyOutcome } from "@/types/n8n-lead-event";

export function logN8nFollowUpOutcome(
  requestId: string,
  leadId: string | null,
  outcome: N8nNotifyOutcome,
  detail?: string,
): void {
  if (process.env.NODE_ENV !== "development") return;
  const leadPart = leadId ? ` leadId=${leadId}` : "";
  const safeDetail = detail ? ` detail=${detail.slice(0, 120)}` : "";
  console.info(
    `[n8n/follow-up] requestId=${requestId}${leadPart} outcome=${outcome}${safeDetail}`,
  );
}
