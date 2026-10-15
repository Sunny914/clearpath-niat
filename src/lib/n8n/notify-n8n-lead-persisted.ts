import { buildN8nLeadPersistedEvent } from "@/lib/n8n/build-lead-persisted-event";
import { logN8nFollowUpOutcome } from "@/lib/n8n/n8n-follow-up-log";
import type { BriefPersistenceStatus } from "@/types/brief-api";
import type { N8nNotifyOutcome } from "@/types/n8n-lead-event";
import { shouldTriggerN8nFollowUp } from "@/types/n8n-lead-event";
import type { DecisionBriefResult, LeadIntakeFormData } from "@/types/lead";

export const N8N_WEBHOOK_SECRET_HEADER = "x-clearpath-secret";

export const DEFAULT_N8N_TIMEOUT_MS = 8_000;

export function isN8nFollowUpConfigured(): boolean {
  return Boolean(
    process.env.N8N_WEBHOOK_URL?.trim() &&
      process.env.N8N_WEBHOOK_SECRET?.trim(),
  );
}

export type NotifyN8nLeadPersistedInput = {
  persistence: BriefPersistenceStatus;
  requestId: string;
  leadId: string;
  lead: LeadIntakeFormData;
  brief: DecisionBriefResult;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

export type NotifyN8nLeadPersistedResult = {
  outcome: N8nNotifyOutcome;
};

function resolveTimeoutMs(): number {
  const configured = Number(process.env.N8N_TIMEOUT_MS);
  if (Number.isFinite(configured) && configured >= 1_000) {
    return configured;
  }
  return DEFAULT_N8N_TIMEOUT_MS;
}

export async function notifyN8nLeadPersisted(
  input: NotifyN8nLeadPersistedInput,
): Promise<NotifyN8nLeadPersistedResult> {
  const { requestId, leadId, lead, brief, persistence } = input;

  if (!shouldTriggerN8nFollowUp(persistence)) {
    logN8nFollowUpOutcome(requestId, leadId, "skipped_not_eligible");
    return { outcome: "skipped_not_eligible" };
  }

  if (!isN8nFollowUpConfigured()) {
    logN8nFollowUpOutcome(requestId, leadId, "skipped_not_configured");
    return { outcome: "skipped_not_configured" };
  }

  const url = process.env.N8N_WEBHOOK_URL!.trim();
  const secret = process.env.N8N_WEBHOOK_SECRET!.trim();
  const payload = buildN8nLeadPersistedEvent({
    leadId,
    requestId,
    lead,
    brief,
  });

  const fetchFn = input.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), input.timeoutMs ?? resolveTimeoutMs());

  try {
    const response = await fetchFn(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [N8N_WEBHOOK_SECRET_HEADER]: secret,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      logN8nFollowUpOutcome(
        requestId,
        leadId,
        "http_error",
        `status=${response.status}`,
      );
      return { outcome: "http_error" };
    }

    logN8nFollowUpOutcome(requestId, leadId, "success");
    return { outcome: "success" };
  } catch (error) {
    const outcome: N8nNotifyOutcome =
      error instanceof Error && error.name === "AbortError"
        ? "timeout"
        : "network_error";
    logN8nFollowUpOutcome(requestId, leadId, outcome);
    return { outcome };
  } finally {
    clearTimeout(timer);
  }
}
