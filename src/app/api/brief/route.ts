import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { isBriefGenerationError } from "@/lib/brief-errors";
import {
  logBriefFailure,
  logBriefRequestStart,
  logBriefSuccess,
  logBriefTimings,
} from "@/lib/brief-request-log";
import {
  BriefGenerationError,
  createDecisionBrief,
} from "@/lib/brief-generation";
import {
  BriefTimingCollector,
  formatTimingLog,
} from "@/lib/brief-timing";
import {
  findExistingLeadByIdempotencyKey,
  persistLeadAndBrief,
} from "@/lib/persist-lead-and-brief";
import { notifyN8nLeadPersisted } from "@/lib/n8n/notify-n8n-lead-persisted";
import { getSupabaseAdminClient } from "@/lib/supabase/server-client";
import type { BriefApiSuccessResponse } from "@/types/brief-api";
import {
  BRIEF_IDEMPOTENCY_KEY_HEADER,
  BRIEF_LEAD_ID_HEADER,
  BRIEF_PERSISTENCE_HEADER,
} from "@/types/brief-api";
import {
  BRIEF_REQUEST_ID_HEADER,
  BRIEF_SOURCE_HEADER,
} from "@/types/brief-generation";
import {
  isValidLeadPayload,
  validateLeadIntake,
} from "@/lib/validate-lead-intake";
import type { LeadIntakeFormData } from "@/types/lead";

function jsonError(
  requestId: string,
  message: string,
  status: number,
): NextResponse {
  return NextResponse.json(
    { error: message, requestId },
    {
      status,
      headers: { [BRIEF_REQUEST_ID_HEADER]: requestId },
    },
  );
}

function clientErrorMessage(error: BriefGenerationError): string {
  switch (error.code) {
    case "missing_api_key":
      return "Brief generation is not configured. Please try again later.";
    case "timeout":
      return "The request took too long. Please try again.";
    case "provider":
    case "invalid_output":
      return "We could not generate your brief right now. Please try again.";
    default:
      return "We could not generate your brief right now. Please try again.";
  }
}

function statusForError(error: BriefGenerationError): number {
  return error.code === "missing_api_key" ? 503 : 502;
}

function successResponse(
  body: BriefApiSuccessResponse,
  source: string,
): NextResponse {
  const headers: Record<string, string> = {
    [BRIEF_SOURCE_HEADER]: source,
    [BRIEF_REQUEST_ID_HEADER]: body.requestId,
    [BRIEF_PERSISTENCE_HEADER]: body.persistence,
  };
  if (body.persistence === "saved" || body.persistence === "duplicate") {
    headers[BRIEF_LEAD_ID_HEADER] = body.leadReferenceId;
  }
  return NextResponse.json(body, { headers });
}

export async function POST(request: Request) {
  const requestId = randomUUID();
  const timing = new BriefTimingCollector();
  timing.markStart("total_api");
  logBriefRequestStart(requestId);

  const idempotencyKey =
    request.headers.get(BRIEF_IDEMPOTENCY_KEY_HEADER)?.trim() || null;

  try {
    let body: unknown;
    timing.markStart("parse_json");
    try {
      body = await request.json();
    } catch {
      timing.markEnd("parse_json");
      logBriefFailure(requestId, "invalid_json_body");
      return jsonError(requestId, "Invalid JSON body.", 400);
    }
    timing.markEnd("parse_json");

    timing.markStart("validate_lead");
    if (!isValidLeadPayload(body)) {
      const message =
        body && typeof body === "object"
          ? validateLeadIntake(body as LeadIntakeFormData)
          : null;
      timing.markEnd("validate_lead");
      logBriefFailure(requestId, "validation", message ?? "shape_mismatch");
      return jsonError(
        requestId,
        message ?? "Invalid form data.",
        400,
      );
    }
    timing.markEnd("validate_lead");

    const lead = body as LeadIntakeFormData;
    const supabase = getSupabaseAdminClient();

    if (supabase && idempotencyKey) {
      timing.markStart("idempotency_lookup");
      const existing = await findExistingLeadByIdempotencyKey(
        supabase,
        idempotencyKey,
      );
      timing.markEnd("idempotency_lookup");
      if (existing) {
        timing.markEnd("total_api");
        logBriefSuccess(
          requestId,
          existing.source,
          timing.phasesMs.total_api ?? 0,
        );
        return successResponse(
          {
            persistence: "duplicate",
            leadReferenceId: existing.leadId,
            requestId,
            brief: existing.brief,
          },
          existing.source,
        );
      }
    }

    const { result, source } = await createDecisionBrief(lead, { timing });

    if (!supabase) {
      timing.markEnd("total_api");
      logBriefSuccess(requestId, source, timing.phasesMs.total_api ?? 0);
      logBriefTimings(
        requestId,
        formatTimingLog(requestId, timing.phasesMs, timing.meta),
      );
      return successResponse(
        {
          persistence: "not_configured",
          leadReferenceId: requestId,
          requestId,
          brief: result,
        },
        source,
      );
    }

    timing.markStart("persist_lead");
    const persistResult = await persistLeadAndBrief(supabase, {
      requestId,
      idempotencyKey,
      lead,
      brief: result,
      source,
    });
    timing.markEnd("persist_lead");

    timing.markEnd("total_api");
    logBriefTimings(
      requestId,
      formatTimingLog(requestId, timing.phasesMs, timing.meta),
    );

    if (!persistResult.ok) {
      logBriefFailure(requestId, "unexpected", persistResult.errorCategory);
      logBriefSuccess(requestId, source, timing.phasesMs.total_api ?? 0);
      return successResponse(
        {
          persistence: "failed",
          leadReferenceId: requestId,
          requestId,
          brief: result,
        },
        source,
      );
    }

    let n8nFollowUp: BriefApiSuccessResponse["n8nFollowUp"] = null;
    if (persistResult.status === "saved") {
      timing.markStart("n8n_follow_up");
      const n8nResult = await notifyN8nLeadPersisted({
        persistence: persistResult.status,
        requestId,
        leadId: persistResult.leadId,
        lead,
        brief: result,
      });
      timing.markEnd("n8n_follow_up");
      n8nFollowUp = n8nResult.preparedForReview ?? null;
    }

    logBriefSuccess(requestId, source, timing.phasesMs.total_api ?? 0);

    return successResponse(
      {
        persistence: persistResult.status,
        leadReferenceId: persistResult.leadId,
        requestId,
        brief: result,
        n8nFollowUp,
      },
      source,
    );
  } catch (error) {
    timing.markEnd("total_api");
    logBriefTimings(
      requestId,
      formatTimingLog(requestId, timing.phasesMs, timing.meta),
    );

    if (isBriefGenerationError(error)) {
      logBriefFailure(requestId, error.code);
      return jsonError(
        requestId,
        clientErrorMessage(error as BriefGenerationError),
        statusForError(error as BriefGenerationError),
      );
    }

    logBriefFailure(requestId, "unexpected");
    return jsonError(
      requestId,
      "We could not generate your brief right now. Please try again.",
      500,
    );
  }
}
