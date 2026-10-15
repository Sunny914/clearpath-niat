import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  buildN8nLeadPersistedEvent,
  n8nPayloadContainsForbiddenFields,
} from "@/lib/n8n/build-lead-persisted-event";
import {
  DEFAULT_N8N_TIMEOUT_MS,
  isN8nFollowUpConfigured,
  notifyN8nLeadPersisted,
  N8N_WEBHOOK_SECRET_HEADER,
} from "@/lib/n8n/notify-n8n-lead-persisted";
import { shouldTriggerN8nFollowUp } from "@/types/n8n-lead-event";
import type { DecisionBriefResult, LeadIntakeFormData } from "@/types/lead";

const syntheticLead: LeadIntakeFormData = {
  studentName: "Synthetic Student",
  educationStage: "Other",
  educationStageOther: "Gap year",
  class12Stream: "",
  class12StreamOther: "",
  completionYear: "",
  stateCity: "Synthetic City",
  preferredStudyArea: "Undecided",
  mainConcern: "Fees",
  mainConcernOther: "",
  guardianDiscussion: "Yes",
  applicationStatus: "Not applied",
  preferredNextStep: "Receive information",
  phoneNumber: "9876543210",
  additionalQuestions: "",
  preferredLanguage: "English",
  financialContextOptional: "",
  consent: true,
  counsellingContactConsent: false,
};

const syntheticBrief: DecisionBriefResult = {
  statedConcernCategory: "Fees",
  evidenceBasedResponse: ["Use official sources."],
  verifiedSourceLinks: [
    { title: "NIAT", url: "https://www.niatindia.com/" },
  ],
  unansweredQuestionsForHumanConfirmation: ["Confirm fees with counsellor."],
  counsellorPreCallSummary: "Internal only",
  recommendedNextAction: "Review official fee materials.",
  recommendedNextActionRationale: "Fees were the priority.",
};

describe("shouldTriggerN8nFollowUp", () => {
  it("triggers only for saved persistence", () => {
    assert.equal(shouldTriggerN8nFollowUp("saved"), true);
    assert.equal(shouldTriggerN8nFollowUp("duplicate"), false);
    assert.equal(shouldTriggerN8nFollowUp("failed"), false);
    assert.equal(shouldTriggerN8nFollowUp("not_configured"), false);
  });
});

describe("buildN8nLeadPersistedEvent", () => {
  it("builds minimal contract payload without phone or student name", () => {
    const payload = buildN8nLeadPersistedEvent({
      leadId: "11111111-1111-4111-8111-111111111111",
      requestId: "22222222-2222-4222-8222-222222222222",
      lead: syntheticLead,
      brief: syntheticBrief,
    });
    assert.equal(payload.eventType, "lead_persisted");
    assert.equal(payload.persistence, "saved");
    assert.equal(payload.counsellingContactConsent, false);
    assert.equal(payload.applicationStatus, "Not applied");
    assert.equal(n8nPayloadContainsForbiddenFields(payload), false);
    assert.equal(JSON.stringify(payload).includes("9876543210"), false);
    assert.equal(JSON.stringify(payload).includes("Synthetic Student"), false);
  });
});

describe("notifyN8nLeadPersisted", () => {
  let urlBackup: string | undefined;
  let secretBackup: string | undefined;

  beforeEach(() => {
    urlBackup = process.env.N8N_WEBHOOK_URL;
    secretBackup = process.env.N8N_WEBHOOK_SECRET;
  });

  afterEach(() => {
    if (urlBackup === undefined) delete process.env.N8N_WEBHOOK_URL;
    else process.env.N8N_WEBHOOK_URL = urlBackup;
    if (secretBackup === undefined) delete process.env.N8N_WEBHOOK_SECRET;
    else process.env.N8N_WEBHOOK_SECRET = secretBackup;
  });

  it("skips when persistence is not saved", async () => {
    process.env.N8N_WEBHOOK_URL = "http://localhost:5678/webhook/clearpath-lead";
    process.env.N8N_WEBHOOK_SECRET = "test-secret";
    let called = false;
    const result = await notifyN8nLeadPersisted({
      persistence: "duplicate",
      requestId: "22222222-2222-4222-8222-222222222222",
      leadId: "11111111-1111-4111-8111-111111111111",
      lead: syntheticLead,
      brief: syntheticBrief,
      fetchImpl: async () => {
        called = true;
        return new Response("{}", { status: 200 });
      },
    });
    assert.equal(result.outcome, "skipped_not_eligible");
    assert.equal(called, false);
  });

  it("skips when n8n env is missing", async () => {
    delete process.env.N8N_WEBHOOK_URL;
    delete process.env.N8N_WEBHOOK_SECRET;
    assert.equal(isN8nFollowUpConfigured(), false);
    const result = await notifyN8nLeadPersisted({
      persistence: "saved",
      requestId: "22222222-2222-4222-8222-222222222222",
      leadId: "11111111-1111-4111-8111-111111111111",
      lead: syntheticLead,
      brief: syntheticBrief,
    });
    assert.equal(result.outcome, "skipped_not_configured");
  });

  it("sends auth header and minimal body on success", async () => {
    process.env.N8N_WEBHOOK_URL = "http://localhost:5678/webhook/clearpath-lead";
    process.env.N8N_WEBHOOK_SECRET = "test-secret-for-unit-test";
    let capturedHeaders: HeadersInit | undefined;
    let capturedBody = "";
    const result = await notifyN8nLeadPersisted({
      persistence: "saved",
      requestId: "22222222-2222-4222-8222-222222222222",
      leadId: "11111111-1111-4111-8111-111111111111",
      lead: syntheticLead,
      brief: syntheticBrief,
      fetchImpl: async (_url, init) => {
        capturedHeaders = init?.headers;
        capturedBody = String(init?.body ?? "");
        return new Response(
          JSON.stringify({
            ok: true,
            status: "prepared_for_review",
            concernCategory: "Fees",
            recommendedNextAction: "Review official fee materials.",
            recommendedNextActionRationale: "Synthetic test.",
            suggestedHandling: "Information follow-up for human review",
            followUpDraft: "Draft text for counsellor review.",
            messageSent: false,
            counsellingBooked: false,
          }),
          { status: 200 },
        );
      },
    });
    assert.equal(result.outcome, "success");
    assert.equal(result.preparedForReview?.status, "prepared_for_review");
    assert.match(
      result.preparedForReview?.followUpDraft ?? "",
      /Draft text/,
    );
    const headers = capturedHeaders as Record<string, string>;
    assert.equal(headers[N8N_WEBHOOK_SECRET_HEADER], "test-secret-for-unit-test");
    assert.equal(capturedBody.includes("9876543210"), false);
    assert.equal(capturedBody.includes("Synthetic Student"), false);
    assert.match(capturedBody, /"eventType":"lead_persisted"/);
  });

  it("returns http_error without throwing on non-2xx", async () => {
    process.env.N8N_WEBHOOK_URL = "http://localhost:5678/webhook/clearpath-lead";
    process.env.N8N_WEBHOOK_SECRET = "test-secret";
    const result = await notifyN8nLeadPersisted({
      persistence: "saved",
      requestId: "22222222-2222-4222-8222-222222222222",
      leadId: "11111111-1111-4111-8111-111111111111",
      lead: syntheticLead,
      brief: syntheticBrief,
      fetchImpl: async () => new Response("nope", { status: 500 }),
    });
    assert.equal(result.outcome, "http_error");
  });

  it("returns timeout outcome on abort", async () => {
    process.env.N8N_WEBHOOK_URL = "http://localhost:5678/webhook/clearpath-lead";
    process.env.N8N_WEBHOOK_SECRET = "test-secret";
    const result = await notifyN8nLeadPersisted({
      persistence: "saved",
      requestId: "22222222-2222-4222-8222-222222222222",
      leadId: "11111111-1111-4111-8111-111111111111",
      lead: syntheticLead,
      brief: syntheticBrief,
      timeoutMs: 5,
      fetchImpl: (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const err = new Error("Aborted");
            err.name = "AbortError";
            reject(err);
          });
        }),
    });
    assert.equal(result.outcome, "timeout");
  });

  it("uses default timeout at least 1s", () => {
    assert.ok(DEFAULT_N8N_TIMEOUT_MS >= 1000);
  });
});
