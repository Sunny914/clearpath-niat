import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCounsellorBriefView,
  buildStudentBriefView,
  maskPhoneNumber,
  resolveAudienceTab,
  studentViewExposesCounsellorOnlyFields,
  STUDENT_BRIEF_VIEW_KEYS,
} from "@/lib/brief-audience-views";
import type { BriefSessionContext } from "@/lib/brief-audience-views";
import type { DecisionBriefResult } from "@/types/lead";

const sampleBrief: DecisionBriefResult = {
  statedConcernCategory: "Fees and affordability",
  evidenceBasedResponse: ["Use official NIAT materials for fee details."],
  verifiedSourceLinks: [
    {
      title: "NIAT India — official website",
      url: "https://www.niatindia.com/",
    },
  ],
  unansweredQuestionsForHumanConfirmation: ["Confirm current fee schedule with counsellor."],
  counsellorPreCallSummary: "INTERNAL: Student anxious about EMI; verify official fee doc.",
  recommendedNextAction: "Review official fee information with family.",
  recommendedNextActionRationale: "Fees were the stated priority.",
};

const sampleLead: BriefSessionContext["lead"] = {
  studentName: "Test Student",
  educationStage: "Currently in Class 12",
  educationStageOther: "",
  class12Stream: "PCM",
  class12StreamOther: "",
  completionYear: "2026",
  stateCity: "Hyderabad",
  preferredStudyArea: "Software development",
  mainConcern: "Fees",
  mainConcernOther: "",
  guardianDiscussion: "Planning to",
  applicationStatus: "Not applied",
  preferredNextStep: "Request a counselling call",
  phoneNumber: "9876543210",
  additionalQuestions: "Can parents join the first call?",
  preferredLanguage: "English",
  financialContextOptional: "",
  consent: true,
  counsellingContactConsent: true,
};

const ctx: BriefSessionContext = {
  leadReferenceId: "ref-abc-123",
  requestId: "req-abc-123",
  persistence: "saved",
  lead: sampleLead,
  brief: sampleBrief,
};

describe("buildStudentBriefView", () => {
  it("maps DecisionBriefResult fields and family questions without counsellor summary", () => {
    const view = buildStudentBriefView(ctx);
    assert.equal(view.mainConcern, "Fees and affordability");
    assert.deepEqual(view.evidenceBasedResponse, sampleBrief.evidenceBasedResponse);
    assert.equal(view.familyDiscussionQuestions[0], "Can parents join the first call?");
    assert.equal(
      studentViewExposesCounsellorOnlyFields(view, sampleBrief),
      false,
    );
    for (const key of STUDENT_BRIEF_VIEW_KEYS) {
      assert.ok(key in view);
    }
    assert.equal("counsellorPreCallSummary" in view, false);
  });
});

describe("buildCounsellorBriefView", () => {
  it("includes lead reference, intake context, and masked phone only", () => {
    const view = buildCounsellorBriefView(ctx);
    assert.equal(view.leadReferenceId, "ref-abc-123");
    assert.match(view.educationContext, /Class 12/);
    assert.match(view.statedInterests, /Software development/);
    assert.equal(view.mainConcern, "Fees");
    assert.equal(view.applicationStatus, "Not applied");
    assert.equal(view.unresolvedQuestions.length, 1);
    assert.match(view.suggestedDiscussionTopics[0] ?? "", /INTERNAL/);
    assert.equal(view.phoneOnFileMasked, "•••• •••3210");
    assert.match(view.contactPermissionStatus, /No call has been booked/);
    assert.equal(view.followUpPreference, "Request a counselling call");
  });

  it("does not expose full phone digits in masked form", () => {
    assert.equal(maskPhoneNumber("9876543210"), "•••• •••3210");
    assert.equal(maskPhoneNumber(""), null);
  });
});

describe("resolveAudienceTab", () => {
  it("falls back to student when counsellor view is disabled", () => {
    assert.equal(resolveAudienceTab("counsellor", false), "student");
  });
});

describe("conditional audience rendering guards", () => {
  it("student view omits counselling-call phone from serialized payload", () => {
    const view = buildStudentBriefView(ctx);
    const serialized = JSON.stringify(view);
    assert.equal(serialized.includes("9876543210"), false);
    assert.equal(serialized.includes("9876"), false);
  });
});
