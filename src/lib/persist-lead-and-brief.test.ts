import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildIntakeSnapshotForStorage,
  mapBriefRowToDecisionBriefResult,
  redactLeadForEventPayload,
} from "@/lib/persist-lead-and-brief";
import type { LeadIntakeFormData } from "@/types/lead";

const sampleLead: LeadIntakeFormData = {
  studentName: "Test Student",
  educationStage: "Other",
  educationStageOther: "Gap year",
  class12Stream: "",
  class12StreamOther: "",
  completionYear: "",
  stateCity: "Hyderabad",
  preferredStudyArea: "Undecided",
  mainConcern: "Fees",
  mainConcernOther: "",
  guardianDiscussion: "Yes",
  applicationStatus: "Not applied",
  preferredNextStep: "Request a counselling call",
  phoneNumber: "9876543210",
  additionalQuestions: "",
  preferredLanguage: "English",
  financialContextOptional: "",
  consent: true,
  counsellingContactConsent: true,
};

describe("persist-lead-and-brief helpers", () => {
  it("omits phone from intake snapshot JSON", () => {
    const snapshot = buildIntakeSnapshotForStorage(sampleLead);
    assert.equal("phoneNumber" in snapshot, false);
    assert.equal(snapshot.mainConcern, "Fees");
  });

  it("redacts phone from event payload but records consent flags", () => {
    const payload = redactLeadForEventPayload(sampleLead);
    assert.equal(payload.phoneProvided, true);
    assert.equal(payload.consentDataProcessing, true);
    assert.equal(payload.consentCounsellingContact, true);
    const serialized = JSON.stringify(payload);
    assert.equal(serialized.includes("9876543210"), false);
  });

  it("maps decision_briefs row back to DecisionBriefResult", () => {
    const mapped = mapBriefRowToDecisionBriefResult({
      stated_concern_category: "Fees",
      evidence_based_response: ["Line one"],
      verified_source_links: [
        { title: "NIAT", url: "https://www.niatindia.com/" },
      ],
      unanswered_questions: ["Confirm fees with counsellor"],
      counsellor_pre_call_summary: "Internal note",
      recommended_next_action: "Review official sources",
      recommended_next_action_rationale: "Fees priority",
    });
    assert.ok(mapped);
    assert.equal(mapped!.statedConcernCategory, "Fees");
  });

  it("returns null for malformed brief rows", () => {
    assert.equal(
      mapBriefRowToDecisionBriefResult({
        stated_concern_category: "Fees",
        evidence_based_response: "not-an-array",
        verified_source_links: [],
        unanswered_questions: [],
        counsellor_pre_call_summary: "",
        recommended_next_action: "",
        recommended_next_action_rationale: "",
      }),
      null,
    );
  });
});
